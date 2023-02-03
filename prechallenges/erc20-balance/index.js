
const getAuthorBalance = ({chainTicker, address, decimals}, authorAddress) => {
  // mock getting the author balance from the blockchain
  return 10000
}

const getChallengeVerification = async ({chainTicker = '', address = '', decimals = '', symbol = '', minBalance = ''} = {}, challengeAnswer, publication) => {
  if (!chainTicker) {
    throw Error('missing option chainTicker')
  }
  if (!address) {
    throw Error('missing option address')
  }
  // symbol isn't used in the challenge, but could be used to display the token symbol in frontend
  if (!symbol) {
    throw Error('missing option symbol')
  }
  if (!decimals) {
    throw Error('missing option decimals')
  }
  if (!minBalance) {
    throw Error('missing option minBalance')
  }
  minBalance = Number(minBalance)

  const authorAddress = publication.author.wallets?.[chainTicker]?.address
  if (!authorAddress) {
    return {
      success: false,
      error: `Author doesn't have a wallet set.`
    }
  }

  let authorBalance
  try {
    authorBalance = await getAuthorBalance({chainTicker, address, decimals}, authorAddress)
  }
  catch (e) {
    return {
      success: false,
      error: `Failed getting author balance from blockchain.`
    }
  }
  if (authorBalance >= minBalance) {
    return {
      success: true
    }
  }
  return {
    success: false,
    error: `Author doesn't have minimum token balance.`
  }
}

module.exports = {getChallengeVerification}
