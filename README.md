#### Types:

```javascript
// Preincluded challenges that the author can run himself before publishing:
// - evm-contract-call
// - fail

// list of challenges included with plebbit-js
Plebbit.challenges = SubplebbitChallengeFile[]

ChallengeRequestMessage { // new props 
  encryptedChallengeCommentCids?: Encrypted<string[]> // some challenges could require including comment cids in other subs, like friendly subplebbit karma challenges
  encryptedChallengeAnswers: Encrypted // some challenges might be included in subplebbit.challenges
}
SubplebbitChallenge { // the public information to display to the user about the challenge, included in Subplebbit.challenges
  exclude?: Exclude[] // singular because it only has to match 1 exclude, the client must know the exclude setting to configure what challengeCommentCids to send
  description?: string // describe to the user what kind of challenge they will receive for publishing
  challenge?: string // some challenges can be asked before the user publishes, like a password for example
  type?: 'image' | 'text' | 'audio' | 'video' | 'html'
}
SubplebbitChallengeSettings extends SubplebbitChallenge { // the private settings of the challenge (subplebbit.settings.challenges)
  path?: the path to the challenge js file, used to get the props SubplebbitChallengeFile {optionInputs, type, getChallenge} 
  options?: GetChallengeOptions // the options argument to be passed to the getChallenge function
  optionInputs?: OptionInput[] // the options inputs fields to display to the user
  getChallenge: (c?: SubplebbitChallengeSettings, r?: ChallengeRequestMessage, a?: ChallengeAnswerMessage): GetChallengeResult | ChallengeAndAnswer
}
SubplebbitChallengeFile { // the result of the function exported by the challenge file
  optionInputs?: SubplebbitChallengeSettings.getChallenge.optionInputs
  type: SubplebbitChallenge.type
  challenge?: string // some challenges can be asked before the user publishes, like a password for example
  getChallenge: SubplebbitChallengeSettings.getChallenge
}
GetChallengeOptions {
  [optionPropertyName: string]: string // all values must be strings for UI ease of use
}
ChallengeAndAnswer { // if the result of a challenge can't be optained by getChallenge(), return a challenge
  challenge: string // e.g. '2 + 2'
  answer: string // e.g. '4'
  type: 'image' | 'text' | 'audio' | 'video' | 'html'
}
GetChallengeResult { // if the result of a challenge can be optained by getChallenge, return the result
  success?: boolean
  error?: string // the reason why the challenge failed, add it to ChallengeVerificationMessage.errors
}
Exclude { // all conditions in Exclude are AND, for OR, use another Exclude item in the Exclude array
  subplebbit?: ExcludeSubplebbit // exclude if author karma (from challengeRequestMessage.challengeCommentCids) in another subplebbit is greater or equal
  postScore?: number // exclude if author post score is greater or equal
  postReply?: number // exclude if author reply score is greater or equal
  firstCommentTimestamp?: number // exclude if author account age is greater or equal
  challenges?: number[] // exclude if all challenges with indexes passed, e.g. challenges: [0, 1] excludes if challenges at index 0 AND 1 passed, plural because has to match all
  post?: boolean // exclude challenge if publication is a post
  reply?: boolean // exclude challenge if publication is a reply
  vote?: boolean // exclude challenge if publication is a vote
  role?: string[] // exclude challenge if author.role.role = one of the string, singular because it only has to match 1 role
  address?: string[] // exclude challenge if author.address = one of the string, singular because it only has to match 1 address
}
ExcludeSubplebbit { // singular because it only has to match 1 subplebbit
  addresses: string[] // list of subplebbit addresses that can be used to exclude, plural because not a condition field like 'role'
  maxCommentCids: number // maximum amount of comment cids that will be fetched to check
  postScore?: number
  postReply?: number
  firstCommentTimestamp?: number
  role?: string[] // exclude challenge if author.role.role = one of the string, singular because it only has to match 1 role
}
OptionInput {
  option: string // option property name, e.g. characterCount
  label: string // option title, e.g. Character Count
  default: string // option default value, e.g. 10
  description?: string // e.g. Amount of characters of the captcha
  placeholder?: string // the value to display if the input field is empty, e.g. 10
}
```
