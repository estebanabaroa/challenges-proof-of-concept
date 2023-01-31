require('util').inspect.defaultOptions.maxStringLength = 50
const path = require('path')

// define mock Subplebbit instances
const textMathChallegeSubplebbit = {
  title: 'text-math challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'text-math'),
        options: {difficulty: 3}
      }
    ]
  }
}
const captchaAndMathChallegeSubplebbit = {
  title: 'captcha and math challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'captcha-canvas-v3'),
        options: {
          width: 600, 
          height: 400,
          characters: 10,
          color: '#000000'
        }
      },
      {
        path: path.join(__dirname, 'challenges', 'text-math'),
        options: {difficulty: 1}
      }
    ]
  }
}
const excludeHighKarmaChallegeSubplebbit = {
  title: 'exclude high karma challenge subplebbit',
  settings: {
    challenges: [
      {
        path: path.join(__dirname, 'challenges', 'text-math'),
        options: {difficulty: 3},
        // exclude if the author match any one item in the array
        exclude: [
          {postScore: 100, replyScore: 100}, // exclude author that has more than 100 post score AND 100 reply score
          {firstCommentTimestamp: Date.now() - 1000*60*60*24*100} // exclude author with account age older than 100 days
        ]
      }
    ]
  }
}
const subplebbits = [textMathChallegeSubplebbit, captchaAndMathChallegeSubplebbit, excludeHighKarmaChallegeSubplebbit]

// define mock Author instances
const highKarmaAuthor = {address: 'high-karma.eth'}
const lowKarmaAuthor = {address: 'low-karma.eth'}
const authors = [highKarmaAuthor, lowKarmaAuthor]
  
// define mock author karma scores and account age
const subplebbitAuthors = {
  [highKarmaAuthor.address]: {
    [excludeHighKarmaChallegeSubplebbit.title]: {postScore: 1000, replyScore: 1000, firstCommentTimestamp: 1}
  }
}

;(async () => {
  // interate over all authors to get a challenge for it
  for (const author of authors) {
    console.log('')
    console.log('')
    console.log('-- author ' + author.address + ':')
    console.log('')

    for (const subplebbit of subplebbits) {
      const challenges = []

      // interate over all challenges of the subplebbit, can be more than 1
      for (const subplebbitChallenge of subplebbit.settings.challenges) {

        // exclude author from challenge based on the subplebbit minimum karma settings
        const subplebbitAuthor = subplebbitAuthors[author.address]?.[subplebbit.title]
        if (shouldExcludeAuthor(subplebbitChallenge, subplebbitAuthor)) {
          continue
        }

        // get the getChallenge function
        const {getChallenge} = require(subplebbitChallenge.path)

        // call the getChallenge function using the options of subplebbit.challenges[i]
        const challenge = await getChallenge(subplebbitChallenge.options)

        challenges.push(challenge)
      }

      console.log('----', subplebbit.title + ':')
      console.log('')
      console.log(challenges)
      console.log('')
    }
  }
})()

function shouldExcludeAuthor(subplebbitChallenge, subplebbitAuthor) {
  if (!subplebbitAuthor || !subplebbitChallenge.exclude) {
    return false
  }

  // if match any of the exclude array, should exclude
  for (const exclude of subplebbitChallenge.exclude) {
    // if match all of the exclude item properties, should exclude
    if (
      (!exclude.postScore || exclude.postScore < subplebbitAuthor.postScore) &&
      (!exclude.replyScore || exclude.replyScore < subplebbitAuthor.replyScore) &&
      (!exclude.firstCommentTimestamp || exclude.firstCommentTimestamp > subplebbitAuthor.firstCommentTimestamp)
    ) {
      return true
    }
  }
  return false
}
