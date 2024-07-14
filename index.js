require('dotenv').config(); // Load .env file
require('colors');
const moment = require('moment');
const { JsonRpcProvider, ethers } = require('ethers');
const { checkBalance, loadPrivateKeys, checkClaimableAmount, getNextClaimTime, checkNextClaim, RPC_URL } = require('./src/utils');

// Define colors
const colors = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  NC: '\x1b[0m' // No Color
};

// ASCII Art
const asciiArt = `
${colors.RED}  ________  ___      ___  ________   ${colors.NC}
${colors.GREEN} /"       )|"  \\    /"  ||"      "\\"  ${colors.NC}
${colors.YELLOW}(:   \\___/  \\   \\  //   |(.  ___  :) ${colors.NC}
${colors.BLUE} \\___  \\    /\\\\  \\/.    ||: \\   ) || ${colors.NC}
${colors.MAGENTA}  __/  \\\\  |: \\.        |(| (___\\ || ${colors.NC}
${colors.CYAN} /" \\   :) |.  \\    /:  ||:       :) ${colors.NC}
(_______/  |___|\\__/|___|(________/  ${colors.NC}
`;

// Print ASCII Art
console.log(asciiArt);

const CONTRACT_ADDRESS = '0xeBBa6Ffff611b7530b57Ed07569E9695B98e6c82';
const { RIVALZ_ABI } = require('./src/abi');

async function main() {
  // Initialize provider
  const provider = new JsonRpcProvider(RPC_URL);

  // Load private keys from .env file
  const privateKeys = await loadPrivateKeys();

  if (privateKeys.length === 0) {
    console.error('Tidak ada private key yang ditemukan dalam file .env.');
    return;
  }

  // Loop untuk setiap private key
  for (const privateKey of privateKeys) {
    if (!privateKey) {
      console.error('Private key tidak ada.');
      continue;
    }

    // Create wallet
    const wallet = new ethers.Wallet(privateKey, provider);
    const senderAddress = wallet.address;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, RIVALZ_ABI, wallet);

    // Check ETH balance
    const balance = await checkBalance(provider, senderAddress);
    console.log(`Alamat: ${senderAddress} - Saldo: ${ethers.formatEther(balance)} ETH`.cyan);

    // Loop utama untuk klaim
    while (true) {
      try {
        // Check claimable amount
        let claimableAmount = await checkClaimableAmount(contract, senderAddress);
        let tokensToClaim = ethers.formatUnits(claimableAmount, 0);
        console.log(`Alamat: ${senderAddress} - Total yang dapat diklaim: ${tokensToClaim}`.cyan);

        // Check next claim
        const nextClaim = await checkNextClaim(contract, senderAddress);
        const nextClaimInMinutes = ethers.formatUnits(nextClaim, 0);
        const nextClaimFormatted = getNextClaimTime(nextClaimInMinutes);
        console.log(`Alamat: ${senderAddress} - Klaim Selanjutnya: ${nextClaimFormatted} Menit`.cyan);

        // Klaim token jika ada yang bisa diklaim
        if (tokensToClaim !== '0') {
          // Lakukan klaim secara berurutan dengan jeda
          const numberOfClaims = parseInt(tokensToClaim);
          for (let i = 0; i < numberOfClaims; i++) {
            // Tunggu waktu klaim selanjutnya jika bukan klaim pertama
            if (i > 0) {
              const waitTime = 10000; // Jeda 10 detik
              console.log(`Menunggu ${waitTime / 1000} detik sebelum klaim berikutnya...`.white);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }

            // Lakukan klaim
            const tx = await contract.claim();

            // Tunggu konfirmasi transaksi
            const receipt = await tx.wait();

            // Periksa status transaksi
            if (receipt.status === 1) {
              console.log(
                `[ ${moment().format('HH:mm:ss')} ] Berhasil mengklaim Fragmentz untuk alamat ${tx.from}`.green
              );
              console.log(
                `[ ${moment().format('HH:mm:ss')} ] Periksa hash transaksi Anda di sini: https://rivalz2.explorer.caldera.xyz/tx/${tx.hash}`.green
              );
            } else {
              console.log(
                `[ ${moment().format('HH:mm:ss')} ] Gagal melakukan klaim Fragmentz untuk alamat ${tx.from}`.red
              );
              console.log(
                `[ ${moment().format('HH:mm:ss')} ] Periksa hash transaksi Anda di sini: https://rivalz2.explorer.caldera.xyz/tx/${tx.hash}`.red
              );
            }
          }
        } else {
          // Jika tidak ada yang bisa diklaim, tunggu sebelum memeriksa lagi
          const waitTime = 3600000; // Jeda 1 jam
          console.log(`Menunggu ${waitTime / 1000 / 60 / 60} jam sebelum memeriksa kembali...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        console.error('Error saat melakukan klaim:', error.message);
        // Handle error appropriately

        // Tunggu sebelum mencoba klaim lagi
        const retryDelay = 5000; // Jeda 5 detik
        console.log(`Mencoba klaim kembali dalam ${retryDelay / 1000} detik...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue; // Lanjutkan ke iterasi berikutnya dalam loop while
      }
    }
  }
}

// Eksekusi fungsi main
main().catch(console.error);
