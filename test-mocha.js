const {getChallengeResultOrPendingChallenges, plebbitJsChallenges} = require('./challenges')
const {expect} = require('chai')
const {subplebbits, authors, subplebbitAuthors, challengeAnswers, challengeCommentCids} = require('./fixtures')

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

        const challengeResult = await getChallengeResultOrPendingChallenges(challengeRequestMessage, subplebbit)
        console.log({challengeResult})
      }
    })
  }
})
