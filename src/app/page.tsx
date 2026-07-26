import { eq } from 'drizzle-orm';
import { ArrowRight, Coins, PiggyBank, Shield, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { getWeekLabel, listUsers } from '@/server/service/savings.service';
import { getCurrentTally } from '@/server/service/savings.service';
import { SsePaymentFeed } from '@/ui/components/SsePaymentFeed';
import { WeeklyTallyPreview } from '@/ui/components/WeeklyTallyPreview';

async function getDemoUser() {
  try {
    const allUsers = await listUsers();
    if (!allUsers.length) return null;
    const user = allUsers[0];
    const weekLabel = await getWeekLabel();
    const tally = await getCurrentTally(user.id);
    return { user, tally };
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const demo = await getDemoUser();
  const totalRoundUp = BigInt(demo?.tally?.totalRoundUp ?? '0');
  // Convert to IDR: 1 USDC = 16,000 IDR
  const totalIdr = (totalRoundUp * 16_000n) / 1_000_000n;

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="bg-orange-600 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <PiggyBank className="w-7 h-7" />
          <span className="text-xl font-heading font-bold tracking-tight">TabungPin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="bg-white text-orange-600 font-heading font-semibold px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors text-sm"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Layout E: Hero section top */}
      <section className="bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400 text-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left: Hero copy */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 text-sm font-heading mb-6">
                <Zap className="w-4 h-4" />
                Track B — Savings &amp; DeFi
              </div>
              <h1 className="text-4xl lg:text-5xl font-heading font-bold mb-6 leading-tight">
                Nabung sambil bayar.
                <br />
                <span className="text-orange-100">Setiap rupiah bekerja.</span>
              </h1>
              <p className="text-lg font-body text-orange-100 mb-8 leading-relaxed">
                Setiap pembayaran USDC Anda dibulatkan ke atas. Kembalian receh terkumpul setiap
                minggu. Satu tanda tangan — langsung masuk vault DeFi yield 8.5% APY. Tanpa session
                key, tanpa otomasi tersembunyi.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-white text-orange-600 font-heading font-bold px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors shadow-lg"
                >
                  <PiggyBank className="w-5 h-5" />
                  Lihat Tabungan Saya
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/confirm"
                  className="inline-flex items-center gap-2 bg-orange-700 text-white font-heading font-bold px-6 py-3 rounded-xl hover:bg-orange-800 transition-colors border border-orange-400"
                >
                  <Coins className="w-5 h-5" />
                  Konfirmasi Minggu Ini
                </Link>
              </div>
            </div>

            {/* Right: Stats card */}
            <div className="flex-shrink-0 w-full lg:w-80">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-full bg-orange-300 flex items-center justify-center font-heading font-bold text-orange-900">
                    AP
                  </div>
                  <div>
                    <div className="font-heading font-semibold">Andi Pratama</div>
                    <div className="text-orange-200 text-sm font-body">
                      Pengemudi Gojek · Bandung
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white/10 rounded-xl p-3">
                    <span className="text-orange-200 text-sm font-body">Terkumpul minggu ini</span>
                    <span className="font-heading font-bold text-white text-lg">
                      {demo?.tally ? `Rp ${totalIdr.toLocaleString('id-ID')}` : 'Rp 0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded-xl p-3">
                    <span className="text-orange-200 text-sm font-body">Vault APY</span>
                    <span className="font-heading font-bold text-green-300">8.5%</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/10 rounded-xl p-3">
                    <span className="text-orange-200 text-sm font-body">Perjalanan minggu ini</span>
                    <span className="font-heading font-bold text-white">12 ride</span>
                  </div>
                </div>
                {/* CAP-33 sponsored reserves badge */}
                <div className="mt-4 flex items-center gap-2 bg-blue-500/20 rounded-lg p-2 border border-blue-300/30">
                  <Shield className="w-4 h-4 text-blue-200 flex-shrink-0" />
                  <span className="text-xs text-blue-100 font-body">
                    CAP-33 Sponsored Reserves · Fee-free untuk pengguna baru
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Layout E: Live SSE feed below hero */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Live payment feed */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-lg font-heading font-semibold text-gray-800">
                Live Horizon Payment Feed
              </h2>
            </div>
            <SsePaymentFeed
              account={demo?.user?.stellarAddress ?? ''}
              userId={demo?.user?.id ?? ''}
            />
          </div>

          {/* Weekly tally preview */}
          <div>
            <h2 className="text-lg font-heading font-semibold text-gray-800 mb-4">
              Pratinjau Tally Minggu Ini
            </h2>
            <WeeklyTallyPreview tally={demo?.tally ?? null} userId={demo?.user?.id ?? ''} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-heading font-bold text-center text-gray-900 mb-10">
            Mengapa TabungPin?
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Coins className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="font-heading font-semibold mb-2">Round-Up Otomatis</h3>
              <p className="text-gray-600 font-body text-sm leading-relaxed">
                Setiap pembayaran Gojek dibulatkan ke USDC penuh. Kembalian Rp 350–800 per transaksi
                terkumpul tanpa terasa.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-heading font-semibold mb-2">DeFindex Vault 8.5% APY</h3>
              <p className="text-gray-600 font-body text-sm leading-relaxed">
                Tabungan masuk vault DeFi Stellar yang menghasilkan yield setiap hari. Lebih tinggi
                dari tabungan bank biasa.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-heading font-semibold mb-2">Satu Tanda Tangan Seminggu</h3>
              <p className="text-gray-600 font-body text-sm leading-relaxed">
                Tidak ada session key. Tidak ada akses permanen. Kamu setujui satu transaksi batch
                setiap minggu — dan selesai.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-orange-900 text-orange-200 py-8 px-6 text-center">
        <div className="font-heading font-semibold text-white mb-1">TabungPin</div>
        <div className="font-body text-sm">
          Stellar APAC Hackathon 2026 · Track B: Savings &amp; DeFi ·{' '}
          <span className="text-orange-300">Powered by Stellar + DeFindex</span>
        </div>
      </footer>
    </div>
  );
}
