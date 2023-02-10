
const optionInputs = [
  {
    option: 'chainTicker',
    label: 'chainTicker',
    default: 'eth',
    description: 'The chain ticker',
    placeholder: 'eth'
  },
  {
    option: 'address',
    label: 'Address',
    default: '',
    description: 'The contract address.',
    placeholder: '0x...'
  },
  {
    option: 'abi',
    label: 'ABI',
    default: '',
    description: 'The ABI of the contract method.',
    placeholder: '{"constant":true,"inputs":[{"internalType":"address","name":"account...'
  },
  {
    option: 'condition',
    label: 'Condition',
    default: '',
    description: 'The condition the contract call response must pass.',
    placeholder: '>1000'
  },
  {
    option: 'error',
    label: 'Error',
    default: `Contract call response doesn't pass condition.`,
    description: 'The error to display to the author.'
  },
]

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
    // validate if wallet.signature matches JSON {domainSeparator:"plebbit-author-wallet",authorAddress:"${authorAddress}"}
    return true
  }
  return false
}

const getContractCallResponse = ({chainTicker, address, abi}, authorAddress) => {
  // mock getting the response from the contract call using the contract address and contract method abi, and the author address as argument
  return 10000
}

const conditionHasUnsafeCharacters = (condition) => {
  // condition should only allow true, false, and characters 0-9, <, >, =
  const unsafeCharacters = condition.replace(/true|false|[0-9<>=]/g, '')
  return unsafeCharacters !== ''
}

const getChallenge = async (subplebbitChallengeSettings, challengeRequestMessage, challengeAnswerMessage, challengeIndex) => {
  let {chainTicker, address, abi, condition, error} = subplebbitChallengeSettings?.options || {}

  if (!chainTicker) {
    throw Error('missing option chainTicker')
  }
  if (!address) {
    throw Error('missing option address')
  }
  if (!abi) {
    throw Error('missing option abi')
  }
  abi = JSON.parse(abi)
  if (!condition) {
    throw Error('missing option abi')
  }

  const publication = challengeRequestMessage.publication

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

  let contractCallResponse
  try {
    contractCallResponse = await getContractCallResponse({chainTicker, address, abi}, authorAddress)
  }
  catch (e) {
    return {
      success: false,
      error: `Failed getting contract call response from blockchain.`
    }
  }

  if (conditionHasUnsafeCharacters(condition)) {
    throw Error('condition has unsafe characters')
  }
  contractCallResponse = String(contractCallResponse)
  if (conditionHasUnsafeCharacters(contractCallResponse)) {
    throw Error('contractCallResponse has unsafe characters')
  }
  if (!eval(`${contractCallResponse} ${condition}`)) {
    return {
      success: false,
      error: error || `Contract call response doesn't pass condition.`
    }
  }

  return {
    success: true
  }
}

function SubplebbitChallengeFile (subplebbitChallengeSettings) {
  let {chainTicker} = subplebbitChallengeSettings?.options || {}
  if (!chainTicker) {
    throw Error('missing option chainTicker')
  }
  const type = 'chain/' + chainTicker
  return {getChallenge, optionInputs, type}
}

module.exports = SubplebbitChallengeFile
