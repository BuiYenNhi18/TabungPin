import {
  ArrowRight,
  ChevronLeft,
  Coins,
  FileCode,
  PiggyBank,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { buildBatchXdr, getDashboardData, listUsers } from '@/server/service/savings.service';
import { ConfirmDepositButton } from '@/ui/components/ConfirmDepositButton';

async function loadConfirmData() {
  try {
    const allUsers = await listUsers();
    if (!allUsers.length) return null;
    const userId = allUsers[0].id;
    const [dashboard, batchData] = await Promise.allSettled([
      getDashboardData(userId),
      buildBatchXdr(userId),
    ]);
    return {
      dashboard: dashboard.status === 'fulfilled' ? dashboard.value : null,
      batch: batchData.status === 'fulfilled' ? batchData.value : null,
    };
  } catch {
    return null;
  }
}

export default async function ConfirmPage() {
  const data = await loadConfirmData();
  const dashboard = data?.dashboard;
  const batch = data?.batch;
  const tally = dashboard?.tally;
  const user = dashboard?.user;

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Navbar */}
      <nav className="bg-orange-600 text-white px-6 py-4 flex items-center gap-4 shadow-lg">
        <Link href="/dashboard" className="hover:bg-orange-700 rounded-lg p-1 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <PiggyBank className="w-6 h-6" />
        <span className="text-lg font-heading font-bold">Konfirmasi Setoran</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {!batch || !tally ? (
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-8 text-center">
            <Coins className="w-12 h-12 text-orange-300 mx-auto mb-3" />
            <h2 className="font-heading font-bold text-xl text-gray-800 mb-2">
              Belum ada tally yang tersedia
            </h2>
            <p className="font-body text-gray-500 mb-4">
              Belum ada kembalian yang terkumpul minggu ini, atau tally sudah disetorkan.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-orange-600 text-white font-heading font-semibold px-4 py-2 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Summary card */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-heading font-bold">
                  AP
                </div>
                <div>
                  <div className="font-heading font-semibold">{user?.name ?? 'Andi Pratama'}</div>
                  <div className="text-orange-200 text-sm font-body">Minggu {tally.weekLabel}</div>
                </div>
              </div>
              <div className="text-center py-4">
                <div className="text-orange-200 font-body text-sm mb-1">
                  Jumlah yang akan disetor
                </div>
                <div className="font-heading font-bold text-5xl mb-2" data-testid="deposit-amount">
                  {tally.totalRoundUpIdr}
                </div>
                <div className="text-orange-200 font-body">
                  {tally.totalRoundUpDisplay} USDC · vault DeFindex
                </div>
              </div>
            </div>

            {/* Transaction details */}
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 mb-6">
              <h3 className="font-heading font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-orange-600" />
                Detail Transaksi Stellar
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-body text-gray-500">Source Account</span>
                  <span className="font-heading font-semibold text-gray-800 text-xs truncate max-w-48">
                    {batch.sourceAccount.slice(0, 12)}...{batch.sourceAccount.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-gray-500">Vault Address</span>
                  <span className="font-heading font-semibold text-gray-800 text-xs">
                    GBDEFI...VAULT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-gray-500">Asset</span>
                  <span className="font-heading font-semibold text-gray-800">USDC (Stellar)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-gray-500">Jumlah</span>
                  <span className="font-heading font-semibold text-orange-600">
                    {batch.amountUsdc} USDC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-gray-500">Tipe</span>
                  <span className="font-heading font-semibold text-gray-800">Batch Deposit</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-gray-500">Network</span>
                  <span className="font-heading font-semibold text-gray-800">Stellar Testnet</span>
                </div>
              </div>
            </div>

            {/* Path payment info */}
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-purple-600" />
                <span className="font-heading font-semibold text-purple-800 text-sm">
                  Path Payment strict_send
                </span>
              </div>
              <p className="font-body text-sm text-purple-700">
                Setoran menggunakan Stellar Path Payment untuk routing USDC optimal ke vault.
                Simulasi: {batch.amountUsdc} USDC → {batch.amountUsdc} USDC (fee 0.1%).
              </p>
            </div>

            {/* CAP-33 info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="font-heading font-semibold text-blue-800 text-sm">
                  CAP-33 Sponsored Reserves
                </span>
              </div>
              <p className="font-body text-sm text-blue-700">
                Base reserve dan trustline fee untuk akun Anda disponsori oleh protokol. Pengguna
                baru tidak perlu XLM untuk memulai menabung.
              </p>
            </div>

            {/* Confirm button */}
            <ConfirmDepositButton tallyId={tally.id} amountIdr={tally.totalRoundUpIdr} />

            <p className="text-center text-xs font-body text-gray-400 mt-4">
              Dengan mengkonfirmasi, Anda menyetujui transfer {tally.totalRoundUpDisplay} USDC ke
              DeFindex vault. Tidak ada session key — hanya transaksi tunggal ini.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
