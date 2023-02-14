const {shouldExcludeAuthorCommentCids, shouldExcludeAuthor, shouldExcludeChallengeSuccess} = require('./exclude')

// all challenges included with plebbit-js, in Plebbit.challenges
const textMath = require('./plebbit-js-challenges/text-math')
const captchaCanvasV3 = require('./plebbit-js-challenges/captcha-canvas-v3')
const fail = require('./plebbit-js-challenges/fail')
const blacklist = require('./plebbit-js-challenges/blacklist')
const question = require('./plebbit-js-challenges/question')
const evmContractCall = require('./plebbit-js-challenges/evm-contract-call')

const plebbitJsChallenges = {
  'text-math': textMath,
  'captcha-canvas-v3': captchaCanvasV3,
  'fail': fail,
  'blacklist': blacklist,
  'question': question,
  'evm-contract-call': evmContractCall
}

// const getPendingChallengesOrChallengeVerification
const getChallengeResultOrPendingChallenges = async (challengeRequestMessage, subplebbit) => {
  if (!challengeRequestMessage || typeof challengeRequestMessage !== 'object') {
    throw Error(`getPendingChallengesOrChallengeVerification invalid challengeRequestMessage argument '${challengeRequestMessage}'`)
  }
  if (typeof subplebbit?.plebbit?.getComment !== 'function') {
    throw Error(`getPendingChallengesOrChallengeVerification invalid subplebbit argument '${subplebbit}' invalid subplebbit.plebbit instance`)
  }

  const challengeResults = []
  // interate over all challenges of the subplebbit, can be more than 1
  for (let [challengeIndex, subplebbitChallengeSettings] of subplebbit.settings?.challenges?.entries()) {

    // if the challenge is an external file, fetch it and override the subplebbitChallengeSettings values
    let challengeFile
    if (subplebbitChallengeSettings.path) {
      try {
        const ChallengeFileFactory = require(subplebbitChallengeSettings.path)
        challengeFile = ChallengeFileFactory(subplebbitChallengeSettings)
      }
      catch (e) {
        e.message = `failed importing challenge with path '${subplebbitChallengeSettings.path}': ${e.message}`
        throw e
      }
    }
    // else, the challenge is included with plebbit-js
    else if (subplebbitChallengeSettings.name) {
      const ChallengeFileFactory = plebbitJsChallenges[subplebbitChallengeSettings.name]
      if (!ChallengeFileFactory) {
        throw Error(`plebbit-js challenge with name '${subplebbitChallengeSettings.name}' doesn't exist`)
      }
      challengeFile = ChallengeFileFactory(subplebbitChallengeSettings)
    }

    // we don't have the challenge answer message yet
    const challengeAnswerMessage = undefined
    const challengeResult = await challengeFile.getChallenge(subplebbitChallengeSettings, challengeRequestMessage, challengeAnswerMessage, challengeIndex)
    challengeResults.push(challengeResult)
  }

  // check failures and errors
  let challengeFailureCount = 0
  let pendingChallenges = []
  const challengeErrors = new Array(challengeResults.length)
  for (const [challengeIndex, challengeResult] of challengeResults.entries()) {
    const subplebbitChallengeSettings = subplebbit.settings.challenges[challengeIndex]
    const subplebbitChallenge = getSubplebbitChallengeFromSubplebbitChallengeSettings(subplebbitChallengeSettings)

    // exclude author from challenge based on the subplebbit minimum karma settings
    if (shouldExcludeAuthor(subplebbitChallenge, challengeRequestMessage.publication.author)) {
      continue
    }
    if (await shouldExcludeAuthorCommentCids(subplebbitChallenge, challengeRequestMessage.challengeCommentCids, subplebbit.plebbit)) {
      continue
    }

    // exclude based on other challenges successes
    if (shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResults)) {
      continue
    }

    if (challengeResult.success === false) {
      challengeFailureCount++
      challengeErrors[challengeIndex] = challengeResult.error
    }
    else if (challengeResult.success === true) {
      // do nothing
    }
    else {
      pendingChallenges.push(challengeResult)
    }
  }

  // challenge success can be undefined if there are pending challenges
  let challengeSuccess = undefined

  // if there are any failures, success is false and pending challenges are ignored
  if (challengeFailureCount > 0) {
    challengeSuccess = false
    pendingChallenges = []
  }

  // if there are no pending challenges and no failures, success is true
  if (pendingChallenges.length === 0 && challengeFailureCount === 0) {
    challengeSuccess = true
  }

  // create return value
  if (challengeSuccess === true) {
    return {challengeSuccess}
  }
  else if (challengeSuccess === false) {
    return {challengeSuccess, challengeErrors}
  }
  else {
    return {pendingChallenges}
  }
}

// get the data to be published publicly to subplebbit.challenges
function getSubplebbitChallengeFromSubplebbitChallengeSettings(subplebbitChallengeSettings) {
  if (!subplebbitChallengeSettings || typeof subplebbitChallengeSettings !== 'object') {
    throw Error(`getSubplebbitChallengeFromSubplebbitChallengeSettings invalid subplebbitChallengeSettings argument '${subplebbitChallengeSettings}'`)
  }

  // if the challenge is an external file, fetch it and override the subplebbitChallengeSettings values
  let challengeFile
  if (subplebbitChallengeSettings.path) {
    try {
      const ChallengeFileFactory = require(subplebbitChallengeSettings.path)
      challengeFile = ChallengeFileFactory(subplebbitChallengeSettings)
    }
    catch (e) {
      e.message = `failed importing challenge with path '${subplebbitChallengeSettings.path}': ${e.message}`
      throw e
    }
  }
  // else, the challenge is included with plebbit-js
  else if (subplebbitChallengeSettings.name) {
    const ChallengeFileFactory = plebbitJsChallenges[subplebbitChallengeSettings.name]
    if (!ChallengeFileFactory) {
      throw Error(`plebbit-js challenge with name '${subplebbitChallengeSettings.name}' doesn't exist`)
    }
    challengeFile = ChallengeFileFactory(subplebbitChallengeSettings)
  }
  const {challenge, type} = challengeFile
  const {exclude, description} = subplebbitChallengeSettings
  return {exclude, description, challenge, type}
}

module.exports = {
  plebbitJsChallenges,
  getChallengeResultOrPendingChallenges,
  getSubplebbitChallengeFromSubplebbitChallengeSettings
}
