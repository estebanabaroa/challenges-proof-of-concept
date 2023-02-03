
const verifyAuthorAddress = (publication, chainTicker) => {
  const authorAddress = publication.author.wallets?.[chainTicker]?.address
  const wallet = publication.author.wallets?.[chainTicker]
  const nftAvatar = publication.author?.avatar
  if (authorAddress.endsWith('.eth')) {
    // resolve plebbit-author-address and check if it matches publication.signature.publicKey
    // return true
  }
  if (nftAvatar?.signature) {
    // validate if nftAvatar.signature matches authorAddress
    // validate if nftAvatar.signature matches author.wallets[chainTicker].address
    // return true
  }
  if (wallet?.signature) {
    // validate if wallet.signature matches JSON {domainSeparator:"plebbit-author-address",authorAddress:"${authorAddress}"}
    return true
  }
  return false
}

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

  const verification = await verifyAuthorAddress(publication, chainTicker)
  if (!verification) {
    return {
      success: false,
      error: `Author doesn't signature proof of his wallet address.`
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
