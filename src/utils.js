const RPC_URL = 'https://rivalz2.rpc.caldera.xyz/infra-partner-http';
const fs = require('fs');


async function checkBalance(provider, address) {
  const balance = await provider.getBalance(address);
  return balance;
}

async function loadPrivateKeys() {
  try {
    const data = fs.readFileSync('.env', 'utf8');
    return data.split('\n').filter(key => key.trim() !== '');
  } catch (error) {
    console.error('Error reading .env file:', error);
    return [];
  }
}

function getNextClaimTime(epochTime) {
  const now = Date.now() / 1000; // current epoch time in seconds
  const nextClaimTime = epochTime;

  // Calculate time difference in seconds
  const timeDifference = nextClaimTime - now;

  if (timeDifference <= 0) {
      return 'Waktu klaim sudah berlalu';
  }

  // Convert time difference to hours, minutes, and seconds
  const hours = Math.floor(timeDifference / 3600);
  const minutes = Math.floor((timeDifference % 3600) / 60);
  const seconds = Math.floor(timeDifference % 60);

  return `${hours} jam ${minutes} menit ${seconds} detik lagi`;
}

async function checkClaimableAmount(contract, address) {
  try {
    const claimableAmount = await contract.claimableAmount(address);
    return claimableAmount;
  } catch (error) {
    console.error(`Error fetching claimable amount for ${address}:`, error);
    return ethers.BigNumber.from(0);
  }
}

async function checkNextClaim(contract, address) {
  try {
    const nextClaim = await contract.sNextClaims(address);
    return nextClaim;
  } catch (error) {
    console.error(`Error fetching next claim for ${address}:`, error);
    return ethers.BigNumber.from(0);
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  checkBalance,
  RPC_URL,
  delay,
  checkNextClaim,
  checkClaimableAmount,
  getNextClaimTime,
  loadPrivateKeys
};
