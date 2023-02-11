#### Types:

```javascript
// list of challenges included with plebbit-js
Plebbit.challenges = {[challengeName: string]: ChallengeFile}

// new props 
ChallengeRequestMessage {
  encryptedChallengeCommentCids?: Encrypted<string[]> // some challenges could require including comment cids in other subs, like friendly subplebbit karma challenges
  encryptedChallengeAnswers: Encrypted<string[]> // some challenges might be included in subplebbit.challenges
}
Subplebbit {
  // challenges is public, part of the IPNS record
  challenges: SubplebbitChallenge[]
  // settings is private, not part of the IPNS record
  settings: {
    challenges: SubplebbitChallengeSettings[]
  }
}

// challenges types
SubplebbitChallenge { // copy values from private subplebbit.settings and publish to subplebbit.challenges
  exclude?: Exclude[] // copied from subplebbit.settings.challenges.exclude
  description?: string // copied from subplebbit.settings.challenges.description
  challenge?: string // copied from ChallengeFile.challenge
  type?: // copied from ChallengeFile.type
}
SubplebbitChallengeSettings { // the private settings of the challenge (subplebbit.settings.challenges)
  path?: string // (only if name is undefined) the path to the challenge js file, used to get the props ChallengeFile {optionInputs, type, getChallenge}
  name?: string // (only if path is undefined) the challengeName from Plebbit.challenges to identify it
  options?: [optionPropertyName: string]: string // the options to be used to the getChallenge function, all values must be strings for UI ease of use
  exclude?: Exclude[] // singular because it only has to match 1 exclude, the client must know the exclude setting to configure what challengeCommentCids to send
  description?: string // describe in the frontend what kind of challenge the user will receive when publishing
}
ChallengeFile { // the result of the function exported by the challenge file
  optionInputs?: OptionInput[] // the options inputs fields to display to the user
  type: 'image' | 'text' | 'audio' | 'video' | 'html'
  challenge?: string // some challenges can be static and asked before the user publishes, like a password for example
  getChallenge: GetChallengeFunction
}
GetChallengeFunction {
  (challenge: SubplebbitChallengeSettings, challengeRequest: ChallengeRequestMessage, challengeAnswer: ChallengeAnswerMessage): GetChallengeResult | ChallengeAndAnswer
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
  firstCommentTimestamp?: number // exclude if author account age is greater or equal than now - firstCommentTimestamp
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
  firstCommentTimestamp?: number // exclude if author account age is greater or equal than now - firstCommentTimestamp
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

#### Ideas:
- interface so that the sub owner can display on publication.author.subplebbit the amount paid by the user for payment challenges
- "standard" challenges like "fail" and "evm-contract-call" so that the frontend could calculate the exclude and result of the challenge to see if the author passes it before even publishing
