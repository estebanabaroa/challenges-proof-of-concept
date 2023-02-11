// require('util').inspect.defaultOptions.maxStringLength = 50
require('util').inspect.defaultOptions.depth = null
const path = require('path')
const {shouldExcludeAuthorCommentCids, shouldExcludeAuthor, shouldExcludeChallengeSuccess} = require('./exclude')
const {Plebbit, subplebbits, authors, subplebbitAuthors, challengeAnswers, challengeCommentCids} = require('./fixtures')

;(async () => {
  // interate over all authors to get a challenge for it
  for (const author of authors) {
    console.log('')
    console.log('')
    console.log('--', 'author ' + author.address + ':')
    console.log('')

    // define mock publication message
    let challengeRequestMessage = {
      publication: {
        content: 'some content',
        timestamp: Date.now(),
        author
      },
      // some challenges could require including comment cids in other subs, like friendly subplebbit karma challenges
      challengeCommentCids: challengeCommentCids[author.address]
    }

    for (const subplebbit of subplebbits) {
      // define mock subplebbit author
      challengeRequestMessage.publication.author = {...challengeRequestMessage.publication.author, subplebbit: subplebbitAuthors[author.address]?.[subplebbit.title]}
      // define mock challenge answers in challenge request
      challengeRequestMessage = {...challengeRequestMessage, challengeAnswers: challengeAnswers[author.address]?.[subplebbit.title]}

      const challengeResults = []
      // interate over all challenges of the subplebbit, can be more than 1
      for (let [challengeIndex, subplebbitChallengeSettings] of subplebbit.settings.challenges.entries()) {

        // if the challenge is an external file, fetch it and override the subplebbitChallengeSettings values
        let subplebbitChallengeFile
        if (subplebbitChallengeSettings.path) {
          const SubplebbitChallengeFileFactory = require(subplebbitChallengeSettings.path)
          subplebbitChallengeFile = SubplebbitChallengeFileFactory(subplebbitChallengeSettings)
        }
        // else, the challenge is included with plebbit-js
        else if (subplebbitChallengeSettings.name) {
          const SubplebbitChallengeFileFactory = Plebbit.challenges[subplebbitChallengeSettings.name]
          subplebbitChallengeFile = SubplebbitChallengeFileFactory(subplebbitChallengeSettings)
        }

        // the public data published to subplebbit.challenges
        const subplebbitChallenge = getChallengeFromChallengeSettings(subplebbitChallengeSettings)
        // console.log({subplebbitChallenge, subplebbitChallengeSettings})

        // we don't have the challenge answer message yet
        const challengeAnswerMessage = undefined
        const challengeResult = await subplebbitChallengeFile.getChallenge(subplebbitChallengeSettings, challengeRequestMessage, challengeAnswerMessage, challengeIndex)
        challengeResults.push(challengeResult)
      }

      // check successes and failures
      let success = undefined
      let shouldPublishPendingChallenges = true
      const challengeSuccesses = []
      const challengeFailures = []
      const challengesPending = []
      for (const [challengeIndex, challengeResult] of challengeResults.entries()) {
        const subplebbitChallengeSettings = subplebbit.settings.challenges[challengeIndex]
        const subplebbitChallenge = getChallengeFromChallengeSettings(subplebbitChallengeSettings)

        // exclude author from challenge based on the subplebbit minimum karma settings
        if (shouldExcludeAuthor(subplebbitChallenge, challengeRequestMessage.publication.author)) {
          continue
        }
        if (await shouldExcludeAuthorCommentCids(subplebbitChallenge, challengeRequestMessage.challengeCommentCids)) {
          continue
        }

        // exclude based on other challenges successes
        if (shouldExcludeChallengeSuccess(subplebbitChallenge, challengeResults)) {
          continue
        }

        if (challengeResult.success === false) {
          challengeFailures.push(subplebbit.title + ': ' + challengeResult.error)
          success = false
        }
        else if (challengeResult.success === true) {
          challengeSuccesses.push(subplebbit.title)
        }
        else {
          challengesPending.push(challengeResult)
        }
      }

      // if there are no pending challenges and no failures, success is true
      if (!challengesPending.length && !challengeFailures.length) {
        success = true
      }
      if (!challengesPending.length) {
        shouldPublishPendingChallenges = false
      }
      // if any challenge already failed, all subsequent challenges don't matter
      if (challengeFailures.length) {
        shouldPublishPendingChallenges = false
      }

      console.log('----', subplebbit.title + ':')
      console.log('')
      if (challengeResults.length) {
        console.log('challenges:', challengeResults)
      }
      if (challengeSuccesses.length) {
        console.log('challengeSuccesses:', challengeSuccesses)
      }
      if (challengeFailures.length) {
        console.log('challengeFailures:', challengeFailures)
      }
      if (challengesPending.length) {
        console.log('challengesPending:', challengesPending)
      }
      console.log('shouldPublishPendingChallenges:', shouldPublishPendingChallenges)
      console.log('success:', success)
      console.log('')
    }
  }
})()

// get the data to be published publicly to subplebbit.challenges
function getChallengeFromChallengeSettings(subplebbitChallengeSettings) {
  // if the challenge is an external file, fetch it and override the subplebbitChallengeSettings values
  let subplebbitChallengeFile
  if (subplebbitChallengeSettings.path) {
    const SubplebbitChallengeFileFactory = require(subplebbitChallengeSettings.path)
    subplebbitChallengeFile = SubplebbitChallengeFileFactory(subplebbitChallengeSettings)
  }
  // else, the challenge is included with plebbit-js
  else if (subplebbitChallengeSettings.name) {
    const SubplebbitChallengeFileFactory = Plebbit.challenges[subplebbitChallengeSettings.name]
    subplebbitChallengeFile = SubplebbitChallengeFileFactory(subplebbitChallengeSettings)
  }
  const {challenge, type} = subplebbitChallengeFile
  const {exclude, description} = subplebbitChallengeSettings
  return {exclude, description, challenge, type}
}
