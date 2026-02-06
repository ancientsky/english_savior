// Grammar data for Roblox-themed obstacle course
const GRAMMAR_DATA = [
  {
    sentence: 'I _____ playing Minecraft right now.',
    blank: 'am',
    options: ['am', 'is', 'are', 'was'],
    explain: '主詞是 I，現在進行式用 am + V-ing',
    topic: '現在進行式',
    translation: '我現在正在玩 Minecraft。'
  },
  {
    sentence: 'She _____ a diamond yesterday.',
    blank: 'found',
    options: ['find', 'found', 'finds', 'finding'],
    explain: 'yesterday 表示過去，動詞要用過去式 found',
    topic: '過去式',
    translation: '她昨天找到了一顆鑽石。'
  },
  {
    sentence: 'We _____ built a huge castle.',
    blank: 'have',
    options: ['have', 'has', 'had', 'having'],
    explain: '主詞 We 搭配 have + 過去分詞（現在完成式）',
    topic: '現在完成式',
    translation: '我們已經建造了一座巨大的城堡。'
  },
  {
    sentence: 'The creeper is _____ than the zombie.',
    blank: 'more dangerous',
    options: ['dangerous', 'more dangerous', 'most dangerous', 'dangerousest'],
    explain: '兩者比較用 more + 長形容詞',
    topic: '比較級',
    translation: '苦力怕比殭屍更危險。'
  },
  {
    sentence: 'If I _____ enough iron, I will make armor.',
    blank: 'have',
    options: ['have', 'had', 'has', 'will have'],
    explain: 'If 條件句（第一條件）：If + 現在式, will + 原形',
    topic: '條件句',
    translation: '如果我有足夠的鐵，我就會做盔甲。'
  },
  {
    sentence: 'You should _____ before going to the Nether.',
    blank: 'prepare',
    options: ['prepare', 'prepares', 'prepared', 'preparing'],
    explain: 'should 後面接原形動詞',
    topic: '助動詞',
    translation: '你應該在去地獄之前做好準備。'
  },
  {
    sentence: 'There _____ many mobs in the cave.',
    blank: 'are',
    options: ['is', 'are', 'was', 'am'],
    explain: 'many mobs 是複數，用 there are',
    topic: 'There is/are',
    translation: '洞穴裡有很多怪物。'
  },
  {
    sentence: 'He _____ Roblox every day after school.',
    blank: 'plays',
    options: ['play', 'plays', 'played', 'playing'],
    explain: '主詞 He（第三人稱單數）+ every day（習慣）→ plays',
    topic: '現在簡單式',
    translation: '他每天放學後都玩 Roblox。'
  },
  {
    sentence: 'The sword was _____ by the blacksmith.',
    blank: 'made',
    options: ['make', 'made', 'making', 'makes'],
    explain: '被動語態：was + 過去分詞 (made)',
    topic: '被動語態',
    translation: '這把劍是鐵匠打造的。'
  },
  {
    sentence: 'I want _____ a new world.',
    blank: 'to create',
    options: ['create', 'creating', 'to create', 'created'],
    explain: 'want 後面要接 to + 原形動詞',
    topic: '不定詞',
    translation: '我想要創建一個新世界。'
  },
  {
    sentence: 'This is the _____ sword in the game.',
    blank: 'strongest',
    options: ['strong', 'stronger', 'strongest', 'more strong'],
    explain: '三者以上的最高級：the + 最高級 (-est)',
    topic: '最高級',
    translation: '這是遊戲中最強的劍。'
  },
  {
    sentence: '_____ you ever been to the End?',
    blank: 'Have',
    options: ['Have', 'Has', 'Did', 'Do'],
    explain: '主詞 you + 現在完成式疑問句：Have you ever...?',
    topic: '現在完成式疑問句',
    translation: '你有去過終界嗎？'
  },
  {
    sentence: 'He told me _____ he found a village.',
    blank: 'that',
    options: ['that', 'what', 'which', 'where'],
    explain: '名詞子句用 that 連接',
    topic: '名詞子句',
    translation: '他告訴我他找到了一個村莊。'
  },
  {
    sentence: 'I was mining _____ a creeper exploded.',
    blank: 'when',
    options: ['when', 'while', 'if', 'because'],
    explain: '「正在做某事時，突然...」用 when',
    topic: '時間連接詞',
    translation: '我正在挖礦的時候，一隻苦力怕爆炸了。'
  },
  {
    sentence: 'Neither the sword _____ the axe is strong enough.',
    blank: 'nor',
    options: ['or', 'nor', 'and', 'but'],
    explain: 'neither...nor 是固定搭配：既不...也不',
    topic: '對等連接詞',
    translation: '劍和斧頭都不夠強。'
  },
  {
    sentence: 'The house _____ I built is near the river.',
    blank: 'that',
    options: ['who', 'that', 'where', 'when'],
    explain: '關係代名詞修飾 house（物）用 that/which',
    topic: '關係子句',
    translation: '我建的那棟房子在河邊。'
  },
  {
    sentence: 'They _____ playing for three hours.',
    blank: 'have been',
    options: ['have been', 'has been', 'was', 'are'],
    explain: '現在完成進行式：have been + V-ing（持續動作）',
    topic: '現在完成進行式',
    translation: '他們已經玩了三個小時了。'
  },
  {
    sentence: 'If I _____ a diamond pickaxe, I would mine obsidian.',
    blank: 'had',
    options: ['have', 'had', 'has', 'having'],
    explain: '第二條件句（假設）：If + 過去式, would + 原形',
    topic: '假設語氣',
    translation: '如果我有一把鑽石鎬，我就會去挖黑曜石。'
  },
  {
    sentence: 'Let\'s _____ a team and play together!',
    blank: 'form',
    options: ['form', 'forms', 'formed', 'forming'],
    explain: 'Let\'s 後面接原形動詞',
    topic: '祈使句',
    translation: '我們來組隊一起玩吧！'
  },
  {
    sentence: 'The game is _____ exciting _____ I can\'t stop playing.',
    blank: 'so...that',
    options: ['so...that', 'such...that', 'too...to', 'enough...to'],
    explain: 'so + 形容詞 + that：如此...以至於',
    topic: '結果子句',
    translation: '這個遊戲太刺激了，我停不下來。'
  },
];
