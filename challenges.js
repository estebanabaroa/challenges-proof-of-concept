const {shouldExcludeChallengeCommentCids, shouldExcludePublication, shouldExcludeChallengeSuccess} = require('./exclude')

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

const validateChallengeOrChallengeResult = (challengeOrChallengeResult, challengeIndex, subplebbit) => {
  const subplebbitChallengeSettings = subplebbit.settings.challenges[challengeIndex]
  const error = `invalid challenge result from subplebbit challenge '${subplebbitChallengeSettings.name || subplebbitChallengeSettings.path}' index ${challengeIndex}`
  if (challengeOrChallengeResult?.success !== undefined) {
    if (typeof challengeOrChallengeResult?.success !== 'boolean') {
      throw Error(error)
    }
  }
  else if (
    typeof challengeOrChallengeResult?.challenge !== 'string' ||
    typeof challengeOrChallengeResult?.type !== 'string' ||
    typeof challengeOrChallengeResult?.verify !== 'function'
  ) {
    throw Error(error)
  }
}

const getPendingChallengesOrChallengeVerification = async (challengeRequestMessage, subplebbit) => {
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
    validateChallengeOrChallengeResult(challengeResult, challengeIndex, subplebbit)
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
    if (shouldExcludePublication(subplebbitChallenge, challengeRequestMessage.publication)) {
      continue
    }
    if (await shouldExcludeChallengeCommentCids(subplebbitChallenge, challengeRequestMessage.challengeCommentCids, subplebbit.plebbit)) {
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
      // index is needed to exlude based on other challenge success in getChallengeVerification
      pendingChallenges.push({...challengeResult, index: challengeIndex})
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

const getChallengeVerificationFromChallengeAnswers = async (pendingChallenges, challengeAnswers, subplebbit) => {
  const verifyChallengePromises = []
  for (const i in pendingChallenges) {
    verifyChallengePromises.push(pendingChallenges[i].verify(challengeAnswers[i]))
  }
  const challengeResultsWithPendingIndexes = await Promise.all(verifyChallengePromises)

  // validate results
  for (const [i, challengeResult] of challengeResultsWithPendingIndexes.entries()) {
    if (typeof challengeResult?.success !== 'boolean') {
      const subplebbitChallengeSettings = subplebbit.settings.challenges[pendingChallenges[i].index]
      throw Error(`invalid challenge result from subplebbit challenge '${subplebbitChallengeSettings.name || subplebbitChallengeSettings.path}' index ${pendingChallenges[i].index}`)
    }
  }

  // when filtering only pending challenges, the original indexes get lost so restore them
  const challengeResults = []
  const challengeResultToPendingChallenge = []
  for (const i in challengeResultsWithPendingIndexes) {
    challengeResults[pendingChallenges[i].index] = challengeResultsWithPendingIndexes[i]
    challengeResultToPendingChallenge[pendingChallenges[i].index] = pendingChallenges[i]
  }

  let challengeFailureCount = 0
  const challengeErrors = []
  for (let [challengeIndex, challengeResult] of challengeResults.entries()) {
    // the challenge results that were filtered out were already successful
    if (challengeResult === undefined) {
      continue
    }

    // exclude based on other challenges successes
    if (shouldExcludeChallengeSuccess(subplebbit.settings.challenges[challengeIndex], challengeResults)) {
      continue
    }

    if (challengeResult.success === false) {
      challengeFailureCount++
      challengeErrors[challengeIndex] = challengeResult.error
    }
  }

  if (challengeFailureCount > 0) {
    return {
      challengeSuccess: false,
      challengeErrors
    }
  }
  return {
    challengeSuccess: true,
  }
}

const getChallengeVerification = async (challengeRequestMessage, subplebbit, getChallengeAnswers) => {
  if (!challengeRequestMessage || typeof challengeRequestMessage !== 'object') {
    throw Error(`getChallengeVerification invalid challengeRequestMessage argument '${challengeRequestMessage}'`)
  }
  if (typeof subplebbit?.plebbit?.getComment !== 'function') {
    throw Error(`getChallengeVerification invalid subplebbit argument '${subplebbit}' invalid subplebbit.plebbit instance`)
  }
  if (typeof getChallengeAnswers !== 'function') {
    throw Error(`getChallengeVerification invalid getChallengeAnswers argument '${getChallengeAnswers}' not a function`)
  }

  const {pendingChallenges, pendingChallengeIndexes, challengeSuccess, challengeErrors} = await getPendingChallengesOrChallengeVerification(challengeRequestMessage, subplebbit)

  let challengeVerification
  // was able to verify without asking author for challenges
  if (!pendingChallenges) {
    challengeVerification = {challengeSuccess}
    if (challengeErrors) {
      challengeVerification.challengeErrors = challengeErrors
    }
  }
  // author still has some pending challenges to complete
  else {
    const challenges = pendingChallenges.map(pendingChallenge => pendingChallenge.challenge)
    const challengeAnswers = await getChallengeAnswers(challenges)
    challengeVerification = await getChallengeVerificationFromChallengeAnswers(pendingChallenges, challengeAnswers, subplebbit)
  }
  return challengeVerification
}

// get the data to be published publicly to subplebbit.challenges
const getSubplebbitChallengeFromSubplebbitChallengeSettings = (subplebbitChallengeSettings) => {
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
  getPendingChallengesOrChallengeVerification,
  getChallengeVerificationFromChallengeAnswers,
  getChallengeVerification,
  getSubplebbitChallengeFromSubplebbitChallengeSettings
}
