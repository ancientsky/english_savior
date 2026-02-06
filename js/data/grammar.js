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
  // === 新增 100 題 ===
  // --- 現在簡單式 ---
  {
    sentence: 'She _____ Roblox every weekend.',
    blank: 'plays',
    options: ['play', 'plays', 'played', 'playing'],
    explain: '主詞 She（第三人稱單數）+ 習慣 → plays',
    topic: '現在簡單式',
    translation: '她每個週末都玩 Roblox。'
  },
  {
    sentence: 'My brother _____ not like horror games.',
    blank: 'does',
    options: ['do', 'does', 'did', 'is'],
    explain: '第三人稱單數否定句用 does not',
    topic: '現在簡單式',
    translation: '我哥哥不喜歡恐怖遊戲。'
  },
  {
    sentence: 'Water _____ through the blocks in Minecraft.',
    blank: 'flows',
    options: ['flow', 'flows', 'flowed', 'flowing'],
    explain: 'Water 是第三人稱單數，用 flows（事實描述）',
    topic: '現在簡單式',
    translation: '水會在 Minecraft 裡流過方塊。'
  },
  {
    sentence: '_____ your friends play Minecraft with you?',
    blank: 'Do',
    options: ['Do', 'Does', 'Are', 'Is'],
    explain: '主詞 friends 是複數，疑問句用 Do',
    topic: '現在簡單式',
    translation: '你的朋友們跟你一起玩 Minecraft 嗎？'
  },
  // --- 過去式 ---
  {
    sentence: 'We _____ a new Roblox game last night.',
    blank: 'tried',
    options: ['try', 'tried', 'tries', 'trying'],
    explain: 'last night 表示過去，try 的過去式是 tried',
    topic: '過去式',
    translation: '我們昨晚試了一款新的 Roblox 遊戲。'
  },
  {
    sentence: 'The zombie _____ not drop any items.',
    blank: 'did',
    options: ['do', 'did', 'does', 'was'],
    explain: '過去式否定句用 did not + 原形動詞',
    topic: '過去式',
    translation: '那隻殭屍沒有掉落任何物品。'
  },
  {
    sentence: 'I _____ three enchanted books in the dungeon.',
    blank: 'found',
    options: ['find', 'found', 'finded', 'finding'],
    explain: 'find 的過去式是 found（不規則動詞）',
    topic: '過去式',
    translation: '我在地牢裡找到了三本附魔書。'
  },
  {
    sentence: 'They _____ the Ender Dragon last weekend.',
    blank: 'defeated',
    options: ['defeat', 'defeated', 'defeats', 'defeating'],
    explain: 'last weekend 是過去時間，用過去式 defeated',
    topic: '過去式',
    translation: '他們上週末打敗了終界龍。'
  },
  {
    sentence: 'She _____ her first house out of dirt blocks.',
    blank: 'built',
    options: ['build', 'built', 'builds', 'building'],
    explain: 'build 的過去式是 built（不規則動詞）',
    topic: '過去式',
    translation: '她用泥土方塊建了她的第一間房子。'
  },
  // --- 現在進行式 ---
  {
    sentence: 'They _____ building a roller coaster right now.',
    blank: 'are',
    options: ['is', 'are', 'am', 'was'],
    explain: '主詞 They 是複數，現在進行式用 are + V-ing',
    topic: '現在進行式',
    translation: '他們現在正在建造雲霄飛車。'
  },
  {
    sentence: 'Look! The lava _____ spreading toward our base!',
    blank: 'is',
    options: ['is', 'are', 'am', 'were'],
    explain: 'lava 是不可數名詞（單數），用 is',
    topic: '現在進行式',
    translation: '看！岩漿正在向我們的基地蔓延！'
  },
  {
    sentence: 'I _____ watching a speedrun on YouTube.',
    blank: 'am',
    options: ['am', 'is', 'are', 'be'],
    explain: '主詞 I 搭配 am + V-ing',
    topic: '現在進行式',
    translation: '我正在 YouTube 上看一個速通影片。'
  },
  // --- 過去進行式 ---
  {
    sentence: 'I _____ farming when the thunderstorm started.',
    blank: 'was',
    options: ['was', 'were', 'am', 'is'],
    explain: '主詞 I + 過去進行式用 was + V-ing',
    topic: '過去進行式',
    translation: '暴風雨開始時，我正在種田。'
  },
  {
    sentence: 'They _____ exploring a cave while I was crafting.',
    blank: 'were',
    options: ['was', 'were', 'are', 'is'],
    explain: '主詞 They 是複數，過去進行式用 were + V-ing',
    topic: '過去進行式',
    translation: '他們在探索洞穴，同時我在製作物品。'
  },
  {
    sentence: 'She _____ streaming on YouTube when the power went out.',
    blank: 'was',
    options: ['was', 'were', 'is', 'has'],
    explain: '主詞 She + 過去進行式用 was + V-ing',
    topic: '過去進行式',
    translation: '停電的時候她正在 YouTube 上直播。'
  },
  // --- 未來式 ---
  {
    sentence: 'I _____ build a castle tomorrow.',
    blank: 'will',
    options: ['will', 'am', 'was', 'have'],
    explain: 'tomorrow 表示未來，用 will + 原形動詞',
    topic: '未來式',
    translation: '我明天要建一座城堡。'
  },
  {
    sentence: 'We _____ going to start a new survival world.',
    blank: 'are',
    options: ['are', 'is', 'am', 'will'],
    explain: 'We + be going to → are going to（計畫中的未來）',
    topic: '未來式',
    translation: '我們打算開一個新的生存世界。'
  },
  {
    sentence: 'She _____ going to upload a new video tonight.',
    blank: 'is',
    options: ['is', 'are', 'am', 'was'],
    explain: '主詞 She + be going to → is going to',
    topic: '未來式',
    translation: '她今晚打算上傳一部新影片。'
  },
  {
    sentence: 'The update _____ add new mobs to the game.',
    blank: 'will',
    options: ['will', 'is', 'does', 'has'],
    explain: '描述未來會發生的事，用 will + 原形動詞',
    topic: '未來式',
    translation: '這次更新將會在遊戲中加入新的怪物。'
  },
  // --- 助動詞 ---
  {
    sentence: 'You _____ wear armor before fighting the Wither.',
    blank: 'must',
    options: ['must', 'can', 'may', 'will'],
    explain: 'must 表示「必須」，強烈建議',
    topic: '助動詞',
    translation: '你必須在對抗乾燥者之前穿上盔甲。'
  },
  {
    sentence: '_____ I join your Roblox server?',
    blank: 'Can',
    options: ['Can', 'Will', 'Must', 'Shall'],
    explain: 'Can I...? 用來請求允許',
    topic: '助動詞',
    translation: '我可以加入你的 Roblox 伺服器嗎？'
  },
  {
    sentence: 'You _____ cheat in multiplayer games.',
    blank: 'must not',
    options: ['must not', 'can', 'should', 'will'],
    explain: 'must not 表示「禁止」',
    topic: '助動詞',
    translation: '你不可以在多人遊戲中作弊。'
  },
  {
    sentence: 'He _____ swim across the lava. He needs a fire potion.',
    blank: 'cannot',
    options: ['cannot', 'must not', 'should', 'will'],
    explain: 'cannot 表示「無法、不能」',
    topic: '助動詞',
    translation: '他無法游過岩漿。他需要防火藥水。'
  },
  {
    sentence: 'We _____ practice building to get better.',
    blank: 'should',
    options: ['should', 'must', 'can', 'may'],
    explain: 'should 表示「應該」，建議',
    topic: '助動詞',
    translation: '我們應該練習建築來進步。'
  },
  // --- 被動語態 ---
  {
    sentence: 'The village was _____ by zombies.',
    blank: 'attacked',
    options: ['attack', 'attacked', 'attacking', 'attacks'],
    explain: '被動語態：was + 過去分詞 attacked',
    topic: '被動語態',
    translation: '村莊被殭屍攻擊了。'
  },
  {
    sentence: 'Diamonds are _____ deep underground.',
    blank: 'found',
    options: ['find', 'found', 'finding', 'finds'],
    explain: '被動語態：are + 過去分詞 found',
    topic: '被動語態',
    translation: '鑽石在地底深處被發現。'
  },
  {
    sentence: 'The new map _____ designed by a famous creator.',
    blank: 'was',
    options: ['was', 'were', 'is', 'did'],
    explain: '被動語態：The map was designed（單數主詞用 was）',
    topic: '被動語態',
    translation: '這張新地圖是由一位知名創作者設計的。'
  },
  {
    sentence: 'The video has been _____ by millions of people.',
    blank: 'watched',
    options: ['watch', 'watched', 'watching', 'watches'],
    explain: '現在完成被動：has been + 過去分詞',
    topic: '被動語態',
    translation: '這部影片已經被數百萬人觀看了。'
  },
  // --- 比較級 ---
  {
    sentence: 'A diamond sword is _____ than a stone sword.',
    blank: 'stronger',
    options: ['strong', 'stronger', 'strongest', 'more strong'],
    explain: '兩者比較用比較級：strong → stronger',
    topic: '比較級',
    translation: '鑽石劍比石劍更強。'
  },
  {
    sentence: 'This Roblox game is _____ than the last one we played.',
    blank: 'more fun',
    options: ['funner', 'more fun', 'most fun', 'funnest'],
    explain: 'fun 的比較級用 more fun',
    topic: '比較級',
    translation: '這款 Roblox 遊戲比我們上次玩的更好玩。'
  },
  {
    sentence: 'Building in creative mode is _____ than survival mode.',
    blank: 'easier',
    options: ['easy', 'easier', 'easiest', 'more easy'],
    explain: 'easy → easier（y 結尾改 i 加 er）',
    topic: '比較級',
    translation: '在創造模式建造比生存模式簡單。'
  },
  {
    sentence: 'The Nether is much _____ than the Overworld.',
    blank: 'hotter',
    options: ['hot', 'hotter', 'hottest', 'more hot'],
    explain: 'hot → hotter（短母音 + 子音，重複子音加 er）',
    topic: '比較級',
    translation: '地獄比主世界熱得多。'
  },
  // --- 最高級 ---
  {
    sentence: 'Netherite is the _____ material in Minecraft.',
    blank: 'rarest',
    options: ['rare', 'rarer', 'rarest', 'more rare'],
    explain: '三者以上的最高級：the + -est',
    topic: '最高級',
    translation: '獄髓是 Minecraft 中最稀有的材料。'
  },
  {
    sentence: 'That was the _____ video I have ever watched.',
    blank: 'funniest',
    options: ['funny', 'funnier', 'funniest', 'most funny'],
    explain: 'funny → funniest（y 結尾改 i 加 est）',
    topic: '最高級',
    translation: '那是我看過最有趣的影片。'
  },
  {
    sentence: 'This is the _____ popular game on Roblox.',
    blank: 'most',
    options: ['more', 'most', 'much', 'very'],
    explain: '長形容詞的最高級用 the most + 形容詞',
    topic: '最高級',
    translation: '這是 Roblox 上最受歡迎的遊戲。'
  },
  // --- 現在完成式 ---
  {
    sentence: 'I have _____ this game for two years.',
    blank: 'played',
    options: ['play', 'played', 'playing', 'plays'],
    explain: '現在完成式：have + 過去分詞 played',
    topic: '現在完成式',
    translation: '我玩這款遊戲已經兩年了。'
  },
  {
    sentence: 'She has _____ collected all the achievements.',
    blank: 'already',
    options: ['already', 'yet', 'never', 'ever'],
    explain: 'already 放在 has 和過去分詞之間，表示「已經」',
    topic: '現在完成式',
    translation: '她已經收集了所有成就。'
  },
  {
    sentence: 'We haven\'t _____ the new update yet.',
    blank: 'tried',
    options: ['try', 'tried', 'trying', 'tries'],
    explain: '現在完成式否定：haven\'t + 過去分詞',
    topic: '現在完成式',
    translation: '我們還沒試過新的更新。'
  },
  {
    sentence: 'He has _____ beaten this boss before.',
    blank: 'never',
    options: ['never', 'ever', 'already', 'yet'],
    explain: 'never 表示「從未」，放在 has 和過去分詞之間',
    topic: '現在完成式',
    translation: '他從來沒有打敗過這個 Boss。'
  },
  // --- 條件句 ---
  {
    sentence: 'If you _____ the diamond, you will be rich.',
    blank: 'find',
    options: ['find', 'found', 'finds', 'will find'],
    explain: '第一條件句：If + 現在式, will + 原形',
    topic: '條件句',
    translation: '如果你找到鑽石，你就會變有錢。'
  },
  {
    sentence: 'If it _____, we will play indoor games.',
    blank: 'rains',
    options: ['rains', 'rained', 'rain', 'will rain'],
    explain: '第一條件句：If + 現在式（第三人稱加 s）',
    topic: '條件句',
    translation: '如果下雨，我們就玩室內遊戲。'
  },
  {
    sentence: 'I would buy that skin if I _____ enough Robux.',
    blank: 'had',
    options: ['have', 'had', 'has', 'having'],
    explain: '第二條件句（假設）：If + 過去式, would + 原形',
    topic: '條件句',
    translation: '如果我有足夠的 Robux，我就會買那個造型。'
  },
  // --- 假設語氣 ---
  {
    sentence: 'I wish I _____ a better computer to play games.',
    blank: 'had',
    options: ['have', 'had', 'has', 'having'],
    explain: 'I wish + 過去式，表示與現在事實相反的願望',
    topic: '假設語氣',
    translation: '我真希望我有一台更好的電腦來打遊戲。'
  },
  {
    sentence: 'If only I _____ more gems in my inventory!',
    blank: 'had',
    options: ['have', 'had', 'has', 'will have'],
    explain: 'If only + 過去式，表示「要是...就好了」',
    topic: '假設語氣',
    translation: '要是我的背包裡有更多寶石就好了！'
  },
  // --- 不定詞與動名詞 ---
  {
    sentence: 'He enjoys _____ new worlds in Minecraft.',
    blank: 'exploring',
    options: ['explore', 'exploring', 'to explore', 'explored'],
    explain: 'enjoy 後面接動名詞 V-ing',
    topic: '動名詞',
    translation: '他喜歡在 Minecraft 裡探索新世界。'
  },
  {
    sentence: 'I decided _____ a new Roblox account.',
    blank: 'to create',
    options: ['create', 'creating', 'to create', 'created'],
    explain: 'decide 後面接不定詞 to + V',
    topic: '不定詞',
    translation: '我決定要創建一個新的 Roblox 帳號。'
  },
  {
    sentence: 'She finished _____ her YouTube video.',
    blank: 'editing',
    options: ['edit', 'editing', 'to edit', 'edited'],
    explain: 'finish 後面接動名詞 V-ing',
    topic: '動名詞',
    translation: '她剪輯完了她的 YouTube 影片。'
  },
  {
    sentence: 'We plan _____ a new server this summer.',
    blank: 'to start',
    options: ['start', 'starting', 'to start', 'started'],
    explain: 'plan 後面接不定詞 to + V',
    topic: '不定詞',
    translation: '我們計畫今年夏天開一個新伺服器。'
  },
  {
    sentence: 'He kept _____ even after losing three times.',
    blank: 'trying',
    options: ['try', 'trying', 'to try', 'tried'],
    explain: 'keep 後面接動名詞 V-ing',
    topic: '動名詞',
    translation: '即使輸了三次，他還是繼續嘗試。'
  },
  {
    sentence: '_____ games all day is not healthy.',
    blank: 'Playing',
    options: ['Playing', 'Play', 'To playing', 'Played'],
    explain: '動名詞當主詞：Playing games（打遊戲這件事）',
    topic: '動名詞',
    translation: '整天打遊戲是不健康的。'
  },
  {
    sentence: 'She promised _____ me the secret crafting recipe.',
    blank: 'to tell',
    options: ['tell', 'telling', 'to tell', 'told'],
    explain: 'promise 後面接不定詞 to + V',
    topic: '不定詞',
    translation: '她答應要告訴我秘密的合成配方。'
  },
  {
    sentence: 'I avoid _____ in the dark without torches.',
    blank: 'walking',
    options: ['walk', 'walking', 'to walk', 'walked'],
    explain: 'avoid 後面接動名詞 V-ing',
    topic: '動名詞',
    translation: '我避免在沒有火把的情況下走在黑暗中。'
  },
  // --- 關係子句 ---
  {
    sentence: 'The player _____ won the tournament is my friend.',
    blank: 'who',
    options: ['who', 'which', 'where', 'when'],
    explain: '關係代名詞修飾人用 who',
    topic: '關係子句',
    translation: '贏得錦標賽的那個玩家是我的朋友。'
  },
  {
    sentence: 'The pickaxe _____ I crafted broke already.',
    blank: 'that',
    options: ['who', 'that', 'where', 'whom'],
    explain: '關係代名詞修飾物用 that/which',
    topic: '關係子句',
    translation: '我製作的那把鎬已經壞了。'
  },
  {
    sentence: 'The biome _____ we found diamonds is a mesa.',
    blank: 'where',
    options: ['where', 'which', 'who', 'that'],
    explain: '關係副詞 where 修飾地點',
    topic: '關係子句',
    translation: '我們找到鑽石的那個生態域是一個高地。'
  },
  // --- 介系詞 ---
  {
    sentence: 'The treasure is hidden _____ the mountain.',
    blank: 'inside',
    options: ['inside', 'on', 'at', 'to'],
    explain: 'inside 表示「在…裡面」',
    topic: '介系詞',
    translation: '寶藏藏在山裡面。'
  },
  {
    sentence: 'She is good _____ building redstone machines.',
    blank: 'at',
    options: ['at', 'in', 'on', 'to'],
    explain: 'be good at + V-ing：擅長做某事',
    topic: '介系詞',
    translation: '她擅長建造紅石機械。'
  },
  {
    sentence: 'We need to wait _____ the server restarts.',
    blank: 'until',
    options: ['until', 'during', 'while', 'by'],
    explain: 'wait until：等到…為止',
    topic: '介系詞',
    translation: '我們需要等到伺服器重啟。'
  },
  {
    sentence: 'He has been playing _____ 3 o\'clock.',
    blank: 'since',
    options: ['since', 'for', 'from', 'at'],
    explain: 'since + 時間點：從…以來',
    topic: '介系詞',
    translation: '他從三點就開始玩了。'
  },
  {
    sentence: 'They have been online _____ five hours.',
    blank: 'for',
    options: ['for', 'since', 'during', 'in'],
    explain: 'for + 一段時間：持續了…',
    topic: '介系詞',
    translation: '他們已經上線五個小時了。'
  },
  // --- 冠詞 ---
  {
    sentence: 'I found _____ enchanted golden apple!',
    blank: 'an',
    options: ['a', 'an', 'the', '--'],
    explain: 'enchanted 以母音開頭，用 an',
    topic: '冠詞',
    translation: '我找到了一顆附魔金蘋果！'
  },
  {
    sentence: '_____ Ender Dragon is the final boss.',
    blank: 'The',
    options: ['A', 'An', 'The', '--'],
    explain: '特定的唯一事物用 the',
    topic: '冠詞',
    translation: '終界龍是最終Boss。'
  },
  {
    sentence: 'He wants to be _____ YouTuber when he grows up.',
    blank: 'a',
    options: ['a', 'an', 'the', '--'],
    explain: 'YouTuber 以子音 /j/ 開頭，用 a',
    topic: '冠詞',
    translation: '他長大後想當 YouTuber。'
  },
  // --- 連接詞 ---
  {
    sentence: 'I like Minecraft _____ my sister prefers Roblox.',
    blank: 'but',
    options: ['but', 'and', 'so', 'because'],
    explain: 'but 表示「但是」，連接相反的意思',
    topic: '連接詞',
    translation: '我喜歡 Minecraft，但我姊姊比較喜歡 Roblox。'
  },
  {
    sentence: 'Bring food _____ water before you explore.',
    blank: 'and',
    options: ['and', 'but', 'or', 'so'],
    explain: 'and 表示「和」，連接兩個並列的名詞',
    topic: '連接詞',
    translation: '探索之前帶上食物和水。'
  },
  {
    sentence: 'He failed _____ he didn\'t practice enough.',
    blank: 'because',
    options: ['because', 'but', 'so', 'and'],
    explain: 'because 表示「因為」，引導原因',
    topic: '連接詞',
    translation: '他失敗了，因為他練習不夠。'
  },
  {
    sentence: 'You can play solo _____ with friends.',
    blank: 'or',
    options: ['or', 'and', 'but', 'so'],
    explain: 'or 表示「或者」，給予選擇',
    topic: '連接詞',
    translation: '你可以自己玩或跟朋友玩。'
  },
  {
    sentence: 'I ran out of iron, _____ I went mining again.',
    blank: 'so',
    options: ['so', 'but', 'or', 'because'],
    explain: 'so 表示「所以」，表示結果',
    topic: '連接詞',
    translation: '我的鐵用完了，所以我又去挖礦了。'
  },
  // --- There is/are ---
  {
    sentence: 'There _____ a creeper behind you!',
    blank: 'is',
    options: ['is', 'are', 'was', 'were'],
    explain: '單數名詞 a creeper 用 there is',
    topic: 'There is/are',
    translation: '你後面有一隻苦力怕！'
  },
  {
    sentence: 'There _____ no diamonds in this chunk.',
    blank: 'are',
    options: ['is', 'are', 'was', 'has'],
    explain: '複數名詞 diamonds 用 there are',
    topic: 'There is/are',
    translation: '這個區塊裡沒有鑽石。'
  },
  {
    sentence: 'There _____ a lot of lava in the Nether.',
    blank: 'is',
    options: ['is', 'are', 'were', 'has'],
    explain: 'lava 是不可數名詞，用 there is',
    topic: 'There is/are',
    translation: '地獄裡有很多岩漿。'
  },
  // --- 代名詞 ---
  {
    sentence: 'This is my sword. That one is _____.',
    blank: 'yours',
    options: ['your', 'yours', 'you', 'yourself'],
    explain: '所有格代名詞 yours = your sword',
    topic: '代名詞',
    translation: '這是我的劍。那一把是你的。'
  },
  {
    sentence: 'The players helped _____ to defeat the boss.',
    blank: 'each other',
    options: ['each other', 'themselves', 'ourselves', 'himself'],
    explain: 'each other 表示「互相」',
    topic: '代名詞',
    translation: '玩家們互相幫助來打敗 Boss。'
  },
  {
    sentence: 'He built the whole castle by _____.',
    blank: 'himself',
    options: ['himself', 'herself', 'itself', 'themselves'],
    explain: 'by himself 表示「靠他自己」',
    topic: '代名詞',
    translation: '他自己一個人建了整座城堡。'
  },
  // --- 附加問句 ---
  {
    sentence: 'You play Minecraft, _____ you?',
    blank: 'don\'t',
    options: ['don\'t', 'doesn\'t', 'aren\'t', 'isn\'t'],
    explain: '肯定句 + 否定附加問句：You play → don\'t you?',
    topic: '附加問句',
    translation: '你有玩 Minecraft，對吧？'
  },
  {
    sentence: 'She can\'t beat the boss, _____ she?',
    blank: 'can',
    options: ['can', 'can\'t', 'does', 'doesn\'t'],
    explain: '否定句 + 肯定附加問句：can\'t → can she?',
    topic: '附加問句',
    translation: '她打不贏那個 Boss，是吧？'
  },
  {
    sentence: 'This game is really fun, _____ it?',
    blank: 'isn\'t',
    options: ['isn\'t', 'is', 'doesn\'t', 'won\'t'],
    explain: '肯定句 + 否定附加問句：is → isn\'t it?',
    topic: '附加問句',
    translation: '這個遊戲真的很好玩，對吧？'
  },
  // --- 感嘆句 ---
  {
    sentence: '_____ a beautiful build that is!',
    blank: 'What',
    options: ['What', 'How', 'Which', 'Where'],
    explain: 'What + a/an + 形容詞 + 名詞：多麼…的…！',
    topic: '感嘆句',
    translation: '那是多麼美麗的建築啊！'
  },
  {
    sentence: '_____ fast he completed the parkour!',
    blank: 'How',
    options: ['How', 'What', 'Which', 'When'],
    explain: 'How + 形容詞/副詞：多麼…！',
    topic: '感嘆句',
    translation: '他完成跑酷的速度好快啊！'
  },
  // --- 使役動詞 ---
  {
    sentence: 'My mom made me _____ playing at 9 PM.',
    blank: 'stop',
    options: ['stop', 'to stop', 'stopping', 'stopped'],
    explain: 'make + 受詞 + 原形動詞',
    topic: '使役動詞',
    translation: '我媽要求我晚上九點停止玩遊戲。'
  },
  {
    sentence: 'He let me _____ his account for one game.',
    blank: 'use',
    options: ['use', 'to use', 'using', 'used'],
    explain: 'let + 受詞 + 原形動詞',
    topic: '使役動詞',
    translation: '他讓我用他的帳號玩一場遊戲。'
  },
  {
    sentence: 'The teacher had us _____ an essay about our favorite game.',
    blank: 'write',
    options: ['write', 'to write', 'writing', 'wrote'],
    explain: 'have + 受詞 + 原形動詞（叫某人做某事）',
    topic: '使役動詞',
    translation: '老師要我們寫一篇關於我們最愛遊戲的作文。'
  },
  // --- 感官動詞 ---
  {
    sentence: 'I heard someone _____ behind the wall.',
    blank: 'walking',
    options: ['walking', 'to walk', 'walked', 'walks'],
    explain: '感官動詞 + 受詞 + V-ing（強調正在進行）',
    topic: '感官動詞',
    translation: '我聽到有人在牆後面走路。'
  },
  {
    sentence: 'We saw the creeper _____ toward our house.',
    blank: 'move',
    options: ['move', 'to move', 'moved', 'moves'],
    explain: '感官動詞 + 受詞 + 原形動詞（看到整個動作）',
    topic: '感官動詞',
    translation: '我們看到苦力怕朝我們的房子移動。'
  },
  // --- 主詞動詞一致 ---
  {
    sentence: 'Everyone in the server _____ excited about the event.',
    blank: 'is',
    options: ['is', 'are', 'were', 'have'],
    explain: 'Everyone 是單數，用 is',
    topic: '主詞動詞一致',
    translation: '伺服器裡的每個人都對這個活動感到興奮。'
  },
  {
    sentence: 'One of the players _____ cheating.',
    blank: 'was',
    options: ['was', 'were', 'are', 'have'],
    explain: 'One of... 主詞是 One（單數），用 was',
    topic: '主詞動詞一致',
    translation: '其中一個玩家在作弊。'
  },
  {
    sentence: 'Neither my brother nor I _____ good at PvP.',
    blank: 'am',
    options: ['am', 'is', 'are', 'was'],
    explain: 'neither...nor 靠近的主詞是 I，用 am',
    topic: '主詞動詞一致',
    translation: '我哥哥和我都不擅長 PvP。'
  },
  // --- 副詞 ---
  {
    sentence: 'She builds _____ quickly in creative mode.',
    blank: 'very',
    options: ['very', 'much', 'many', 'a lot'],
    explain: 'very 修飾副詞 quickly',
    topic: '副詞',
    translation: '她在創造模式裡建得非常快。'
  },
  {
    sentence: 'He _____ wins in PvP battles.',
    blank: 'always',
    options: ['always', 'ever', 'never', 'yet'],
    explain: 'always 表示「總是」，頻率副詞放在一般動詞前',
    topic: '副詞',
    translation: '他在 PvP 戰鬥中總是贏。'
  },
  {
    sentence: 'The update will come out _____.',
    blank: 'soon',
    options: ['soon', 'fast', 'quick', 'rapid'],
    explain: 'soon 表示「很快」（時間副詞）',
    topic: '副詞',
    translation: '更新很快就會推出。'
  },
  // --- 疑問句 ---
  {
    sentence: '_____ did you find the secret room?',
    blank: 'How',
    options: ['How', 'What', 'Who', 'Which'],
    explain: 'How 詢問方式：你怎麼找到的？',
    topic: '疑問句',
    translation: '你是怎麼找到秘密房間的？'
  },
  {
    sentence: '_____ many subscribers does this channel have?',
    blank: 'How',
    options: ['How', 'What', 'Who', 'Where'],
    explain: 'How many 詢問數量',
    topic: '疑問句',
    translation: '這個頻道有多少訂閱者？'
  },
  {
    sentence: '_____ is your favorite Minecraft biome?',
    blank: 'What',
    options: ['What', 'How', 'Who', 'Where'],
    explain: 'What 詢問「什麼」',
    topic: '疑問句',
    translation: '你最喜歡的 Minecraft 生態域是什麼？'
  },
  // --- 時間連接詞 ---
  {
    sentence: '_____ you finish your homework, you can play games.',
    blank: 'After',
    options: ['After', 'Until', 'Before', 'While'],
    explain: 'After 表示「在…之後」',
    topic: '時間連接詞',
    translation: '你寫完作業之後就可以打遊戲了。'
  },
  {
    sentence: 'I always save my game _____ I log out.',
    blank: 'before',
    options: ['before', 'after', 'while', 'until'],
    explain: 'before 表示「在…之前」',
    topic: '時間連接詞',
    translation: '我總是在登出之前存檔。'
  },
  {
    sentence: '_____ I was building, my friend was mining.',
    blank: 'While',
    options: ['While', 'When', 'After', 'Before'],
    explain: 'While + 進行式，表示兩個同時進行的動作',
    topic: '時間連接詞',
    translation: '當我在建造的時候，我的朋友在挖礦。'
  },
  // --- 名詞子句 ---
  {
    sentence: 'I don\'t know _____ the treasure is hidden.',
    blank: 'where',
    options: ['where', 'what', 'who', 'that'],
    explain: '名詞子句用 where 表示「在哪裡」',
    topic: '名詞子句',
    translation: '我不知道寶藏藏在哪裡。'
  },
  {
    sentence: 'Do you know _____ made this amazing map?',
    blank: 'who',
    options: ['who', 'what', 'where', 'that'],
    explain: '名詞子句用 who 表示「誰」',
    topic: '名詞子句',
    translation: '你知道是誰做了這張很棒的地圖嗎？'
  },
  {
    sentence: 'Tell me _____ you built this redstone machine.',
    blank: 'how',
    options: ['how', 'what', 'who', 'which'],
    explain: '名詞子句用 how 表示「如何」',
    topic: '名詞子句',
    translation: '告訴我你是怎麼建造這台紅石機械的。'
  },
  // --- too...to / enough...to ---
  {
    sentence: 'The wall is too _____ to climb over.',
    blank: 'high',
    options: ['high', 'highly', 'height', 'higher'],
    explain: 'too + 形容詞 + to + V：太…而不能',
    topic: 'too...to / enough',
    translation: '這面牆太高了，爬不過去。'
  },
  {
    sentence: 'He is strong _____ to carry all the items.',
    blank: 'enough',
    options: ['enough', 'too', 'very', 'so'],
    explain: '形容詞 + enough + to + V：足夠…以至於能',
    topic: 'too...to / enough',
    translation: '他夠強壯，可以搬運所有物品。'
  },
  {
    sentence: 'The lava is too _____ to swim in.',
    blank: 'hot',
    options: ['hot', 'hotly', 'hotter', 'hottest'],
    explain: 'too + 形容詞 + to + V',
    topic: 'too...to / enough',
    translation: '岩漿太燙了，不能在裡面游泳。'
  },
  // --- 祈使句 ---
  {
    sentence: '_____ touch the cactus! You will lose health.',
    blank: 'Don\'t',
    options: ['Don\'t', 'Not', 'Doesn\'t', 'No'],
    explain: '否定祈使句：Don\'t + 原形動詞',
    topic: '祈使句',
    translation: '不要碰仙人掌！你會失血。'
  },
  {
    sentence: '_____ careful when you cross the bridge.',
    blank: 'Be',
    options: ['Be', 'Is', 'Are', 'Being'],
    explain: '祈使句用原形動詞開頭：Be careful',
    topic: '祈使句',
    translation: '過橋的時候要小心。'
  },
  // --- 間接問句 ---
  {
    sentence: 'Can you tell me where the village _____?',
    blank: 'is',
    options: ['is', 'is it', 'it is', 'does it'],
    explain: '間接問句用正常語序：where the village is',
    topic: '間接問句',
    translation: '你能告訴我村莊在哪裡嗎？'
  },
  {
    sentence: 'I wonder _____ the new update will come out.',
    blank: 'when',
    options: ['when', 'what', 'who', 'that'],
    explain: 'I wonder + 間接問句：when + 正常語序',
    topic: '間接問句',
    translation: '我想知道新的更新什麼時候會推出。'
  },
  // --- used to ---
  {
    sentence: 'I _____ to play Roblox every day, but now I play Minecraft.',
    blank: 'used',
    options: ['used', 'use', 'using', 'uses'],
    explain: 'used to + V：過去常常（現在不了）',
    topic: 'used to',
    translation: '我以前每天玩 Roblox，但現在玩 Minecraft。'
  },
  {
    sentence: 'She didn\'t _____ to like sandbox games.',
    blank: 'use',
    options: ['use', 'used', 'using', 'uses'],
    explain: 'didn\'t use to：過去不曾（否定）',
    topic: 'used to',
    translation: '她以前不喜歡沙盒遊戲。'
  },
  // --- 數量詞 ---
  {
    sentence: 'There isn\'t _____ wood left to build.',
    blank: 'much',
    options: ['much', 'many', 'a lot', 'few'],
    explain: 'wood 是不可數名詞，否定句用 much',
    topic: '數量詞',
    translation: '剩下的木頭不多了，不夠建造。'
  },
  {
    sentence: 'How _____ iron ore do we need?',
    blank: 'much',
    options: ['much', 'many', 'a lot', 'few'],
    explain: 'iron ore 是不可數名詞，用 How much',
    topic: '數量詞',
    translation: '我們需要多少鐵礦？'
  },
  {
    sentence: 'There are _____ players online right now.',
    blank: 'many',
    options: ['many', 'much', 'a lot', 'little'],
    explain: 'players 是可數名詞複數，用 many',
    topic: '數量詞',
    translation: '現在有很多玩家在線上。'
  },
  {
    sentence: 'Only a _____ people know about this secret.',
    blank: 'few',
    options: ['few', 'little', 'much', 'lot'],
    explain: 'a few + 可數名詞複數：一些',
    topic: '數量詞',
    translation: '只有少數人知道這個秘密。'
  },
  // --- 結果子句 ---
  {
    sentence: 'It was _____ a good video that everyone shared it.',
    blank: 'such',
    options: ['such', 'so', 'too', 'very'],
    explain: 'such + a/an + 形容詞 + 名詞 + that',
    topic: '結果子句',
    translation: '這是一支好影片，每個人都分享了它。'
  },
  {
    sentence: 'The parkour was _____ difficult that nobody could finish it.',
    blank: 'so',
    options: ['so', 'such', 'too', 'very'],
    explain: 'so + 形容詞 + that：如此…以至於',
    topic: '結果子句',
    translation: '這個跑酷太難了，沒有人能完成。'
  },
  // --- 對等連接詞 ---
  {
    sentence: 'Not only is the game fun, _____ it is also educational.',
    blank: 'but',
    options: ['but', 'and', 'or', 'so'],
    explain: 'not only...but (also)：不僅…而且',
    topic: '對等連接詞',
    translation: '這個遊戲不僅好玩，而且有教育意義。'
  },
  {
    sentence: 'Both Minecraft _____ Roblox are popular games.',
    blank: 'and',
    options: ['and', 'or', 'but', 'nor'],
    explain: 'both...and：兩者都…',
    topic: '對等連接詞',
    translation: 'Minecraft 和 Roblox 都是受歡迎的遊戲。'
  },
  {
    sentence: 'Either you join our team _____ you play alone.',
    blank: 'or',
    options: ['or', 'and', 'but', 'nor'],
    explain: 'either...or：不是…就是',
    topic: '對等連接詞',
    translation: '你不是加入我們隊伍，就是自己玩。'
  },
  // --- 現在完成進行式 ---
  {
    sentence: 'She has been _____ YouTube videos since morning.',
    blank: 'watching',
    options: ['watching', 'watched', 'watch', 'watches'],
    explain: '現在完成進行式：has been + V-ing',
    topic: '現在完成進行式',
    translation: '她從早上就一直在看 YouTube 影片。'
  },
  {
    sentence: 'How long have you been _____ for this item?',
    blank: 'waiting',
    options: ['waiting', 'waited', 'wait', 'waits'],
    explain: '現在完成進行式：have been + V-ing',
    topic: '現在完成進行式',
    translation: '你等這個物品等多久了？'
  },
  // --- 過去完成式 ---
  {
    sentence: 'I _____ already left the Nether before the ghast appeared.',
    blank: 'had',
    options: ['had', 'have', 'has', 'was'],
    explain: '過去完成式：had + 過去分詞，表示過去的過去',
    topic: '過去完成式',
    translation: '在乾懼者出現之前，我已經離開地獄了。'
  },
  {
    sentence: 'She _____ never played Minecraft before last week.',
    blank: 'had',
    options: ['had', 'has', 'have', 'was'],
    explain: '過去完成式：had never + 過去分詞',
    topic: '過去完成式',
    translation: '上週之前她從沒玩過 Minecraft。'
  },
  // --- 讓步子句 ---
  {
    sentence: '_____ the game was difficult, we still had fun.',
    blank: 'Although',
    options: ['Although', 'Because', 'If', 'When'],
    explain: 'Although 表示「雖然」，引導讓步子句',
    topic: '讓步子句',
    translation: '雖然遊戲很難，我們還是玩得很開心。'
  },
  {
    sentence: 'He kept playing _____ he was very tired.',
    blank: 'even though',
    options: ['even though', 'because', 'so', 'and'],
    explain: 'even though 表示「即使」',
    topic: '讓步子句',
    translation: '即使他很累，他還是繼續玩。'
  },
  // --- 目的子句 ---
  {
    sentence: 'I crafted a shield _____ I could protect myself.',
    blank: 'so that',
    options: ['so that', 'because', 'although', 'when'],
    explain: 'so that 表示「以便、為了」',
    topic: '目的子句',
    translation: '我做了一面盾牌以便保護自己。'
  },
  {
    sentence: 'She practiced every day _____ order to get better.',
    blank: 'in',
    options: ['in', 'on', 'at', 'for'],
    explain: 'in order to + V：為了…',
    topic: '目的子句',
    translation: '她每天練習，為了變得更厲害。'
  },
  // --- 形容詞順序 ---
  {
    sentence: 'He found a _____ red dragon egg.',
    blank: 'big',
    options: ['big', 'red big', 'dragon big', 'big dragon red'],
    explain: '形容詞順序：大小在顏色前面 → big red',
    topic: '形容詞順序',
    translation: '他找到了一顆大大的紅色龍蛋。'
  },
  // --- 原因子句 ---
  {
    sentence: 'I couldn\'t sleep _____ the zombies were outside.',
    blank: 'because',
    options: ['because', 'although', 'unless', 'until'],
    explain: 'because 引導原因子句',
    topic: '原因子句',
    translation: '我睡不著，因為殭屍在外面。'
  },
  {
    sentence: '_____ it was getting dark, we went back to our base.',
    blank: 'Since',
    options: ['Since', 'Unless', 'Although', 'Until'],
    explain: 'Since 在此表示「因為、既然」',
    topic: '原因子句',
    translation: '因為天快黑了，我們回到了基地。'
  },
  // --- 條件句補充 ---
  {
    sentence: 'You won\'t win _____ you practice more.',
    blank: 'unless',
    options: ['unless', 'if', 'because', 'although'],
    explain: 'unless = if not：除非',
    topic: '條件句',
    translation: '除非你多練習，否則你不會贏。'
  },
  {
    sentence: '_____ long as you have a torch, mobs won\'t spawn.',
    blank: 'As',
    options: ['As', 'So', 'If', 'When'],
    explain: 'As long as：只要…就…',
    topic: '條件句',
    translation: '只要你有火把，怪物就不會生成。'
  },
];
