import {
  ArrowRight,
  ChevronLeft,
  Coins,
  History,
  PiggyBank,
  Shield,
  TrendingUp,
  Vault,
} from 'lucide-react';
import Link from 'next/link';
import { getDashboardData, listUsers } from '@/server/service/savings.service';

async function loadDashboard() {
  try {
    const allUsers = await listUsers();
    if (!allUsers.length) return null;
    return getDashboardData(allUsers[0].id);
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await loadDashboard();

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-center">
          <PiggyBank className="w-16 h-16 text-orange-300 mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold text-gray-700 mb-2">Data belum tersedia</h2>
          <p className="text-gray-500 font-body mb-4">Jalankan seed terlebih dahulu</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-orange-600 text-white font-heading font-semibold px-4 py-2 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const { user, tally, vault, payments } = data;
  const isPending = tally?.status === 'pending';

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Navbar */}
      <nav className="bg-orange-600 text-white px-6 py-4 flex items-center gap-4 shadow-lg">
        <Link href="/" className="hover:bg-orange-700 rounded-lg p-1 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <PiggyBank className="w-6 h-6" />
        <span className="text-lg font-heading font-bold">TabungPin Dashboard</span>
      </nav>

      {/* Layout E: Hero card at top */}
      <section className="bg-gradient-to-br from-orange-600 to-orange-500 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          {/* User info */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-heading font-bold text-xl">
              AP
            </div>
            <div>
              <div className="text-white font-heading font-bold text-lg">{user.name}</div>
              <div className="text-orange-200 text-sm font-body">
                {user.gojekId} · Pengemudi Gojek · Bandung
              </div>
            </div>
            {/* CAP-33 badge */}
            <div className="ml-auto flex items-center gap-1.5 bg-blue-500/30 border border-blue-300/40 rounded-lg px-3 py-1.5">
              <Shield className="w-4 h-4 text-blue-200" />
              <span className="text-xs text-blue-100 font-heading">CAP-33 Sponsored</span>
            </div>
          </div>

          {/* Weekly tally hero */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-orange-200 text-sm font-body">Terkumpul minggu ini</div>
                <div className="text-white font-heading font-bold text-4xl mt-1">
                  {tally?.totalRoundUpIdr ?? 'Rp 0'}
                </div>
                <div className="text-orange-200 font-body text-sm mt-1">
                  {tally?.totalRoundUpDisplay ?? '0.00'} USDC · minggu {tally?.weekLabel ?? ''}
                </div>
              </div>
              <Coins className="w-12 h-12 text-orange-300 opacity-60" />
            </div>

            {isPending && tally ? (
              <Link
                href="/confirm"
                className="w-full flex items-center justify-center gap-2 bg-white text-orange-600 font-heading font-bold py-3.5 rounded-xl hover:bg-orange-50 transition-colors shadow-md text-lg"
                data-testid="confirm-deposit-btn"
              >
                <PiggyBank className="w-5 h-5" />
                Konfirmasi Setor {tally.totalRoundUpIdr}
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <div className="bg-green-500/20 border border-green-300/30 rounded-xl p-3 text-center text-green-200 font-heading font-semibold">
                Sudah disetorkan minggu ini
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main content: two-column on desktop */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Payment history with round-up amounts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-orange-600" />
              <h2 className="font-heading font-bold text-gray-800">Riwayat Pembayaran</h2>
              <span className="ml-auto text-sm font-body text-gray-400">
                {payments.length} transaksi
              </span>
            </div>
            <div
              className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden"
              data-testid="payment-list"
            >
              {payments.length === 0 ? (
                <div className="p-6 text-center text-gray-400 font-body">Belum ada pembayaran</div>
              ) : (
                <div className="divide-y divide-orange-50">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Coins className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-sm text-gray-800 truncate">{p.merchant}</div>
                        <div className="text-xs font-body text-gray-400">
                          {p.amountIdr} ·{' '}
                          {new Date(p.paidAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-heading font-semibold text-gray-800">
                          {p.amountDisplay} USDC
                        </div>
                        {BigInt(p.roundUpAmount) > 0n && (
                          <div className="text-xs font-body text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mt-0.5">
                            +{p.roundUpIdr} round-up
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Vault position */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Vault className="w-5 h-5 text-orange-600" />
              <h2 className="font-heading font-bold text-gray-800">DeFindex Vault</h2>
            </div>
            <div
              className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden"
              data-testid="vault-card"
            >
              {!vault ? (
                <div className="p-6 text-center text-gray-400 font-body">
                  Belum ada posisi vault
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 border-b border-green-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-body text-gray-600">Tersimpan di vault</span>
                      <span
                        className="text-lg font-heading font-bold text-green-700"
                        data-testid="vault-apy"
                      >
                        {vault.apyPercent}% APY
                      </span>
                    </div>
                    <div className="text-3xl font-heading font-bold text-gray-900 mb-1">
                      {vault.depositedDisplay} USDC
                    </div>
                    <div className="text-sm font-body text-gray-500">
                      Nilai sekarang: {vault.currentValueDisplay} USDC
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-body text-gray-600">Estimasi yield/tahun</span>
                      <span className="font-heading font-semibold text-green-600">
                        {vault.annualYieldIdr}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-body text-gray-600">APY</span>
                      <span className="font-heading font-semibold">8.5%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-body text-gray-600">Protokol</span>
                      <span className="font-heading font-semibold text-gray-800">DeFindex</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-body text-gray-600">Network</span>
                      <span className="font-heading font-semibold text-gray-800">
                        Stellar Testnet
                      </span>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <Link
                      href="/confirm"
                      className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white font-heading font-semibold py-2.5 rounded-xl hover:bg-orange-700 transition-colors text-sm"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Tambah ke Vault Minggu Ini
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Stellar features badges */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                <Shield className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <div className="text-xs font-heading font-semibold text-blue-700">CAP-33</div>
                <div className="text-xs font-body text-blue-500">Sponsored Reserves</div>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <div className="text-xs font-heading font-semibold text-purple-700">
                  Path Payment
                </div>
                <div className="text-xs font-body text-purple-500">strict_send USDC</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
