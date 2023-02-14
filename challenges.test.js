// require('util').inspect.defaultOptions.depth = null

const {getPendingChallengesOrChallengeVerification, plebbitJsChallenges, getSubplebbitChallengeFromSubplebbitChallengeSettings} = require('./challenges')
const {expect} = require('chai')
const {subplebbits, authors, subplebbitAuthors, challengeAnswers, challengeCommentCids, results} = require('./fixtures')

describe("plebbitJsChallenges", () => {
  let TextMathFactory = plebbitJsChallenges['text-math']
  let CaptchaCanvasV3Factory = plebbitJsChallenges['text-math']

  it("returns challenges", () => {
    expect(plebbitJsChallenges).to.not.equal(undefined)
    expect(typeof plebbitJsChallenges).to.equal('object')
    expect(typeof TextMathFactory).to.equal('function')
    expect(typeof CaptchaCanvasV3Factory).to.equal('function')
  })

  it("text-math challenge answer can be eval", async () => {
    const textMath = TextMathFactory()
    const {challenge, answer} = await textMath.getChallenge()
    // the challenge can be eval
    expect(answer).to.equal(String(eval(challenge)))
  })

  it("captcha-canvas-v3 challenge is string", async () => {
    const captchaCanvasV3 = CaptchaCanvasV3Factory()
    const {challenge, answer} = await captchaCanvasV3.getChallenge()
    // the challenge can be eval
    expect(typeof challenge).to.equal('string')
  })
})

describe("getChallengesResultAndPendingChallenges", () => {
  for (const subplebbit of subplebbits) {
    it(subplebbit.title, async () => {
      for (const author of authors) {
        // mock challenge request with mock publication
        const challengeRequestMessage = {
          publication: {author: {...author, subplebbit: subplebbitAuthors[author.address]?.[subplebbit.title]}},
          // some challenges could require including comment cids in other subs, like friendly subplebbit karma challenges
          challengeCommentCids: challengeCommentCids[author.address],
          // define mock challenge answers in challenge request
          challengeAnswers: challengeAnswers[author.address]?.[subplebbit.title]
        }

        const challengeResult = await getPendingChallengesOrChallengeVerification(challengeRequestMessage, subplebbit)
        const expectedChallengeResult = results[subplebbit.title][author.address]
        console.log({challengeResult, expectedChallengeResult})
        expect(challengeResult.challengeSuccess).to.equal(expectedChallengeResult.challengeSuccess)
        expect(challengeResult.challengeErrors).to.deep.equal(expectedChallengeResult.challengeErrors)
        expect(challengeResult.pendingChallenges?.length).to.equal(expectedChallengeResult.pendingChallenges?.length)
        if (challengeResult.pendingChallenges?.length) {
          for (const [challengeIndex] of challengeResult.pendingChallenges.entries()) {
            expect(challengeResult.pendingChallenges[challengeIndex].type).to.not.equal(undefined)
            expect(challengeResult.pendingChallenges[challengeIndex].challenge).to.not.equal(undefined)
            expect(challengeResult.pendingChallenges[challengeIndex].answer).to.not.equal(undefined)
            expect(challengeResult.pendingChallenges[challengeIndex].type).to.equal(expectedChallengeResult.pendingChallenges[challengeIndex].type)
            expect(typeof challengeResult.pendingChallenges[challengeIndex].challenge).to.equal(typeof expectedChallengeResult.pendingChallenges[challengeIndex].challenge)
            expect(typeof challengeResult.pendingChallenges[challengeIndex].answer).to.equal(typeof expectedChallengeResult.pendingChallenges[challengeIndex].answer)
          }
        }
      }
    })
  }
})

describe("getSubplebbitChallengeFromSubplebbitChallengeSettings", () => {
  // skip these tests when soloing subplebbits
  if (subplebbits.length < 5) {
    return
  }

  it("has challenge prop", () => {
    const subplebbit = subplebbits.filter(subplebbit => subplebbit.title === 'password challenge subplebbit')[0]
    const subplebbitChallenge = getSubplebbitChallengeFromSubplebbitChallengeSettings(subplebbit.settings.challenges[0])
    expect(typeof subplebbitChallenge.challenge).to.equal('string')
    expect(subplebbitChallenge.challenge).to.equal(subplebbit.settings.challenges[0].options.question)
  })

  it("has description prop", () => {
    const subplebbit = subplebbits.filter(subplebbit => subplebbit.title === 'text-math challenge subplebbit')[0]
    const subplebbitChallenge = getSubplebbitChallengeFromSubplebbitChallengeSettings(subplebbit.settings.challenges[0])
    expect(typeof subplebbitChallenge.description).to.equal('string')
    expect(subplebbitChallenge.description).to.equal(subplebbit.settings.challenges[0].description)
  })

  it("has exclude prop", () => {
    const subplebbit = subplebbits.filter(subplebbit => subplebbit.title === 'exclude high karma challenge subplebbit')[0]
    const subplebbitChallenge = getSubplebbitChallengeFromSubplebbitChallengeSettings(subplebbit.settings.challenges[0])
    expect(subplebbitChallenge.exclude).to.not.equal(undefined)
    expect(subplebbitChallenge.exclude).to.deep.equal(subplebbit.settings.challenges[0].exclude)
  })
})