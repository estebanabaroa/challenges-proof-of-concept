// require('util').inspect.defaultOptions.maxStringLength = 50
require('util').inspect.defaultOptions.depth = null
const path = require('path')
const {shouldExcludeAuthorCommentCids, shouldExcludeAuthor, shouldExcludeChallengeSuccess} = require('./exclude')
const {subplebbits, authors, subplebbitAuthors, challengeAnswers, challengeCommentCids} = require('./fixtures')

// // display mock requirements
// if (process.argv[2] === 'req') {
//   for (const subplebbit of subplebbits) {
//     console.log('--', subplebbit.title)
//     // mock displaying the prechallenges requirements in the interface
//     for (const subplebbitPrechallenge of subplebbit.prechallenges || []) {
//       console.log(subplebbitPrechallenge)
//       console.log(getChallengeRequirements(subplebbitPrechallenge))
//     }

//     // mock displaying the challenges requirements in the interface
//     for (const subplebbitChallenge of subplebbit.settings.challenges) {
//       console.log(subplebbitChallenge)
//       console.log(getChallengeRequirements(subplebbitChallenge))
//     }
//   }
//   process.exit()
// }

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
        if (subplebbitChallengeSettings.path) {
          const SubplebbitChallengeFile = require(subplebbitChallengeSettings.path)
          const subplebbitChallengeFile = SubplebbitChallengeFile(subplebbitChallengeSettings)
          subplebbitChallengeSettings = {...subplebbitChallengeSettings, ...subplebbitChallengeFile}
        }

        // the public data published to subplebbit.challenges
        const subplebbitChallenge = getChallengeFromChallengeSettings(subplebbitChallengeSettings)
        // console.log({subplebbitChallenge, subplebbitChallengeSettings})

        // we don't have the challenge answer message yet
        const challengeAnswerMessage = undefined
        const challengeResult = await subplebbitChallengeSettings.getChallenge(subplebbitChallengeSettings, challengeRequestMessage, challengeAnswerMessage, challengeIndex)
        challengeResults.push(challengeResult)
      }

      // check successes and failures
      let success = undefined
      let shouldPublishPendingChallenges = true
      const challengeSuccesses = []
      const challengeFailures = []
      const challengesPending = []
      for (const [challengeIndex, challengeResult] of challengeResults.entries()) {
        const subplebbitChallenge = subplebbit.settings.challenges[challengeIndex]

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
  let {exclude, description, challenge, type} = subplebbitChallengeSettings
  // get the data provided by the challenge file if any
  if (subplebbitChallengeSettings.path) {
    const SubplebbitChallengeFile = require(subplebbitChallengeSettings.path)
    const subplebbitChallengeFile = SubplebbitChallengeFile(subplebbitChallengeSettings)
    type = subplebbitChallengeFile.type
  }
  return {exclude, description, challenge, type}
}

// function getChallengeRequirements(subplebbitChallenge) {
//   if (subplebbitChallenge.path) {
//     const challengeFile = require(subplebbitChallenge.path)
//     subplebbitChallenge = {...subplebbitChallenge, challengeFile}
//   }

//   const requirements = []
//   if (subplebbitChallenge.options?.chainTicker) {
//     requirements.push('need autor wallet for chain ticker: ' + subplebbitChallenge.options?.chainTicker)
//   }
//   if (subplebbitChallenge.exclude) {
//     for (const exclude of subplebbitChallenge.exclude) {
//       if (exclude.postScore || exclude.replyScore || exclude.firstCommentTimestamp) {
//         requirements.push('karma history could bypass some challenges')
//         break
//       }
//     }
//   }
//   if (subplebbitChallenge.challengeFile?.type) {
//     requirements.push('need an interface that supports type: ' + subplebbitChallenge.challengeFile?.type)
//   }
//   if (subplebbitChallenge.challengeFile?.challengeAnswer) {
//     const challengeAnswerQuery = subplebbitChallenge.options[subplebbitChallenge.challengeFile.challengeAnswerPropName]
//     requirements.push('publishing will automatically include prechallenge answer: ' + subplebbitChallenge.challengeFile?.challengeAnswer + ' with ' + challengeAnswerQuery)
//   }
//   if (subplebbitChallenge.challenge?.type) {
//     let text = 'need an interface that supports type: ' + subplebbitChallenge.challenge?.type
//     if (subplebbitChallenge.challenge.type === 'text' && subplebbitChallenge.challenge.challenge) {
//       text += ', the text challenge is: ' + subplebbitChallenge.challenge.challenge 
//     }
//     else if (subplebbitChallenge.challenge.challenge) {
//       text += ', the challenge is included in the subplebbit'
//     }
//     requirements.push(text)
//   }
//   return requirements
// }
