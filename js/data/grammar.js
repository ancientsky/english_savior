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
  // === 新增第二批 100 題 ===
  // --- 反身代名詞 ---
  {
    sentence: 'Be careful! Don\'t hurt _____ with that sword.',
    blank: 'yourself',
    options: ['yourself', 'you', 'your', 'yours'],
    explain: '反身代名詞 yourself：不要傷到你自己',
    topic: '反身代名詞',
    translation: '小心！不要被那把劍傷到你自己。'
  },
  {
    sentence: 'The cat in Minecraft can defend _____.',
    blank: 'itself',
    options: ['itself', 'it', 'its', 'themselves'],
    explain: '主詞 The cat 是單數第三人稱（物），用 itself',
    topic: '反身代名詞',
    translation: 'Minecraft 裡的貓可以保護自己。'
  },
  {
    sentence: 'We taught _____ how to use redstone.',
    blank: 'ourselves',
    options: ['ourselves', 'us', 'our', 'we'],
    explain: '主詞 We 的反身代名詞是 ourselves',
    topic: '反身代名詞',
    translation: '我們自學了如何使用紅石。'
  },
  // --- 不定代名詞 ---
  {
    sentence: 'Is there _____ in the chest?',
    blank: 'anything',
    options: ['anything', 'something', 'nothing', 'everything'],
    explain: '疑問句中用 anything',
    topic: '不定代名詞',
    translation: '箱子裡有任何東西嗎？'
  },
  {
    sentence: 'I found _____ interesting in the abandoned mineshaft.',
    blank: 'something',
    options: ['something', 'anything', 'nothing', 'everything'],
    explain: '肯定句中用 something',
    topic: '不定代名詞',
    translation: '我在廢棄礦坑裡找到了有趣的東西。'
  },
  {
    sentence: '_____ knows the secret password to the server.',
    blank: 'Nobody',
    options: ['Nobody', 'Somebody', 'Anybody', 'Everybody'],
    explain: 'Nobody 表示「沒有人」',
    topic: '不定代名詞',
    translation: '沒有人知道伺服器的秘密密碼。'
  },
  {
    sentence: '_____ in our team wants to fight the Wither.',
    blank: 'Everyone',
    options: ['Everyone', 'Anyone', 'No one', 'Someone'],
    explain: 'Everyone 表示「每個人」',
    topic: '不定代名詞',
    translation: '我們隊伍裡的每個人都想打乾燥者。'
  },
  // --- 片語動詞 ---
  {
    sentence: 'I need to _____ out how to solve this puzzle.',
    blank: 'figure',
    options: ['figure', 'find', 'look', 'check'],
    explain: 'figure out：想出、弄明白',
    topic: '片語動詞',
    translation: '我需要想辦法解決這個謎題。'
  },
  {
    sentence: 'Don\'t _____ up! You can beat this level.',
    blank: 'give',
    options: ['give', 'take', 'pick', 'make'],
    explain: 'give up：放棄',
    topic: '片語動詞',
    translation: '不要放棄！你可以打過這一關。'
  },
  {
    sentence: 'He _____ up a rare item from the ground.',
    blank: 'picked',
    options: ['picked', 'gave', 'took', 'made'],
    explain: 'pick up：撿起',
    topic: '片語動詞',
    translation: '他從地上撿起了一個稀有物品。'
  },
  {
    sentence: 'Please _____ down the volume. It\'s too loud.',
    blank: 'turn',
    options: ['turn', 'put', 'take', 'bring'],
    explain: 'turn down：調低（音量）',
    topic: '片語動詞',
    translation: '請把音量調小一點，太吵了。'
  },
  {
    sentence: 'We need to _____ on more armor before the boss fight.',
    blank: 'put',
    options: ['put', 'get', 'take', 'turn'],
    explain: 'put on：穿上',
    topic: '片語動詞',
    translation: '我們需要在打 Boss 之前穿上更多盔甲。'
  },
  {
    sentence: 'I\'m looking _____ to the new game update.',
    blank: 'forward',
    options: ['forward', 'up', 'out', 'back'],
    explain: 'look forward to：期待',
    topic: '片語動詞',
    translation: '我很期待新的遊戲更新。'
  },
  {
    sentence: 'We need to come _____ with a better strategy.',
    blank: 'up',
    options: ['up', 'out', 'in', 'down'],
    explain: 'come up with：想出（主意、計策）',
    topic: '片語動詞',
    translation: '我們需要想出更好的策略。'
  },
  // --- -ing/-ed 形容詞 ---
  {
    sentence: 'This puzzle is really _____. I can\'t solve it.',
    blank: 'confusing',
    options: ['confusing', 'confused', 'confuse', 'confuses'],
    explain: '-ing 形容詞描述事物的性質：令人困惑的',
    topic: '-ing/-ed 形容詞',
    translation: '這個謎題真的很令人困惑。我解不出來。'
  },
  {
    sentence: 'I am _____ about the new Minecraft update.',
    blank: 'excited',
    options: ['excited', 'exciting', 'excite', 'excites'],
    explain: '-ed 形容詞描述人的感受：感到興奮的',
    topic: '-ing/-ed 形容詞',
    translation: '我對新的 Minecraft 更新感到很興奮。'
  },
  {
    sentence: 'The horror map was really _____!',
    blank: 'frightening',
    options: ['frightening', 'frightened', 'frighten', 'frightens'],
    explain: '-ing 形容詞描述事物：令人恐懼的',
    topic: '-ing/-ed 形容詞',
    translation: '那個恐怖地圖真的很嚇人！'
  },
  {
    sentence: 'We were _____ when we lost all our items.',
    blank: 'disappointed',
    options: ['disappointed', 'disappointing', 'disappoint', 'disappoints'],
    explain: '-ed 形容詞描述人的感受：感到失望的',
    topic: '-ing/-ed 形容詞',
    translation: '當我們失去所有物品時，我們感到很失望。'
  },
  // --- some/any ---
  {
    sentence: 'Do you have _____ extra diamonds I can borrow?',
    blank: 'any',
    options: ['any', 'some', 'no', 'much'],
    explain: '疑問句中通常用 any',
    topic: 'some/any',
    translation: '你有多餘的鑽石可以借我嗎？'
  },
  {
    sentence: 'I bought _____ new skins from the shop.',
    blank: 'some',
    options: ['some', 'any', 'no', 'much'],
    explain: '肯定句中用 some',
    topic: 'some/any',
    translation: '我從商店買了一些新造型。'
  },
  {
    sentence: 'There aren\'t _____ arrows left in my inventory.',
    blank: 'any',
    options: ['any', 'some', 'no', 'much'],
    explain: '否定句中用 any',
    topic: 'some/any',
    translation: '我的背包裡沒有剩餘的箭了。'
  },
  // --- 所有格 ---
  {
    sentence: 'That is my _____ favorite game.',
    blank: 'sister\'s',
    options: ['sister\'s', 'sisters', 'sister', 'sisters\''],
    explain: '單數名詞的所有格加 \'s',
    topic: '所有格',
    translation: '那是我姊姊最喜歡的遊戲。'
  },
  {
    sentence: 'The _____ swords are all in the chest.',
    blank: 'players\'',
    options: ['players\'', 'player\'s', 'players', 'player'],
    explain: '複數名詞已有 s，所有格只加 \'',
    topic: '所有格',
    translation: '玩家們的劍都在箱子裡。'
  },
  {
    sentence: 'The _____ health bar is almost empty.',
    blank: 'boss\'s',
    options: ['boss\'s', 'boss', 'bosses', 'bosses\''],
    explain: '以 s 結尾的單數名詞所有格加 \'s',
    topic: '所有格',
    translation: 'Boss 的血條快空了。'
  },
  // --- would rather / had better ---
  {
    sentence: 'I would rather _____ Minecraft than do homework.',
    blank: 'play',
    options: ['play', 'playing', 'to play', 'played'],
    explain: 'would rather + 原形動詞：寧願…',
    topic: 'would rather / had better',
    translation: '我寧願玩 Minecraft 也不想做作業。'
  },
  {
    sentence: 'You had better _____ your game before the power goes out.',
    blank: 'save',
    options: ['save', 'saving', 'to save', 'saved'],
    explain: 'had better + 原形動詞：最好…',
    topic: 'would rather / had better',
    translation: '你最好在停電前存檔。'
  },
  {
    sentence: 'We\'d better not _____ into that dark cave alone.',
    blank: 'go',
    options: ['go', 'going', 'to go', 'went'],
    explain: 'had better not + 原形動詞：最好不要…',
    topic: 'would rather / had better',
    translation: '我們最好不要獨自走進那個黑暗的洞穴。'
  },
  {
    sentence: 'I\'d rather you _____ touch my stuff.',
    blank: 'didn\'t',
    options: ['didn\'t', 'don\'t', 'won\'t', 'aren\'t'],
    explain: 'would rather + 人 + 過去式（希望別人不做某事）',
    topic: 'would rather / had better',
    translation: '我寧願你別碰我的東西。'
  },
  // --- 情態動詞 might/could ---
  {
    sentence: 'There _____ be a hidden chest behind that wall.',
    blank: 'might',
    options: ['might', 'will', 'is', 'must'],
    explain: 'might 表示「可能」（不確定的推測）',
    topic: '情態動詞',
    translation: '那面牆後面可能有一個隱藏的箱子。'
  },
  {
    sentence: '_____ you help me defeat this boss?',
    blank: 'Could',
    options: ['Could', 'Might', 'Should', 'Must'],
    explain: 'Could you...? 禮貌請求：你能不能…？',
    topic: '情態動詞',
    translation: '你能幫我打敗這個 Boss 嗎？'
  },
  {
    sentence: 'She _____ have forgotten to save her game.',
    blank: 'might',
    options: ['might', 'will', 'can', 'shall'],
    explain: 'might have + 過去分詞：可能已經…（對過去的推測）',
    topic: '情態動詞',
    translation: '她可能忘了存檔。'
  },
  {
    sentence: 'He plays all day. He _____ really love this game.',
    blank: 'must',
    options: ['must', 'can', 'may', 'shall'],
    explain: 'must 表示很有把握的推測：一定…',
    topic: '情態動詞',
    translation: '他整天都在玩。他一定很喜歡這個遊戲。'
  },
  {
    sentence: 'The server is down. It _____ be under maintenance.',
    blank: 'might',
    options: ['might', 'must', 'will', 'shall'],
    explain: 'might 表示不確定的推測：可能…',
    topic: '情態動詞',
    translation: '伺服器掛了。可能在維護中。'
  },
  // --- 附和句 ---
  {
    sentence: 'I love playing Roblox. — So _____ I!',
    blank: 'do',
    options: ['do', 'am', 'have', 'can'],
    explain: 'So do I：我也是（附和肯定句，一般動詞用 do）',
    topic: '附和句',
    translation: '我喜歡玩 Roblox。——我也是！'
  },
  {
    sentence: 'He can\'t swim in lava. — Neither _____ I.',
    blank: 'can',
    options: ['can', 'do', 'am', 'have'],
    explain: 'Neither can I：我也不行（附和否定句）',
    topic: '附和句',
    translation: '他不能在岩漿中游泳。——我也不行。'
  },
  {
    sentence: 'She has finished the quest. — So _____ he.',
    blank: 'has',
    options: ['has', 'does', 'is', 'did'],
    explain: 'So has he：他也完成了（完成式用 has）',
    topic: '附和句',
    translation: '她完成任務了。——他也完成了。'
  },
  // --- 間接引語 ---
  {
    sentence: 'He said that he _____ playing Minecraft.',
    blank: 'was',
    options: ['was', 'is', 'are', 'am'],
    explain: '間接引語時態後移：is → was',
    topic: '間接引語',
    translation: '他說他正在玩 Minecraft。'
  },
  {
    sentence: 'She told me that she _____ found a diamond.',
    blank: 'had',
    options: ['had', 'has', 'have', 'was'],
    explain: '間接引語時態後移：has found → had found',
    topic: '間接引語',
    translation: '她告訴我她找到了一顆鑽石。'
  },
  {
    sentence: 'They asked me _____ I wanted to join their team.',
    blank: 'if',
    options: ['if', 'that', 'what', 'who'],
    explain: '間接引語的 Yes/No 問句用 if/whether 引導',
    topic: '間接引語',
    translation: '他們問我是否想加入他們的隊伍。'
  },
  {
    sentence: 'He asked me where I _____ the treasure.',
    blank: 'found',
    options: ['found', 'find', 'finding', 'did find'],
    explain: '間接引語用正常語序，且時態後移',
    topic: '間接引語',
    translation: '他問我在哪裡找到寶藏的。'
  },
  // --- 過去完成進行式 ---
  {
    sentence: 'I had been _____ for hours before I found any diamonds.',
    blank: 'mining',
    options: ['mining', 'mined', 'mine', 'mines'],
    explain: '過去完成進行式：had been + V-ing（過去某時之前持續的動作）',
    topic: '過去完成進行式',
    translation: '在找到鑽石之前，我已經挖了好幾個小時了。'
  },
  {
    sentence: 'They had been _____ the game for two years before it shut down.',
    blank: 'playing',
    options: ['playing', 'played', 'play', 'plays'],
    explain: '過去完成進行式：had been + V-ing',
    topic: '過去完成進行式',
    translation: '在遊戲關閉之前，他們已經玩了兩年了。'
  },
  // --- 未來完成式 ---
  {
    sentence: 'By next month, I will have _____ 1000 hours on Minecraft.',
    blank: 'spent',
    options: ['spent', 'spend', 'spending', 'spends'],
    explain: '未來完成式：will have + 過去分詞',
    topic: '未來完成式',
    translation: '到下個月，我在 Minecraft 上的遊玩時數將達到 1000 小時。'
  },
  {
    sentence: 'She will have _____ all the levels by tomorrow.',
    blank: 'completed',
    options: ['completed', 'complete', 'completing', 'completes'],
    explain: '未來完成式：will have + 過去分詞（在未來某時已完成）',
    topic: '未來完成式',
    translation: '到明天她將完成所有關卡。'
  },
  // --- 可數/不可數名詞 ---
  {
    sentence: 'I need more _____ to build a house.',
    blank: 'wood',
    options: ['wood', 'woods', 'a wood', 'woodes'],
    explain: 'wood（木材）是不可數名詞，不加 s',
    topic: '可數/不可數名詞',
    translation: '我需要更多木材來蓋房子。'
  },
  {
    sentence: 'She gave me two _____ of advice for the boss fight.',
    blank: 'pieces',
    options: ['pieces', 'piece', 'advices', 'advise'],
    explain: 'advice 是不可數名詞，用 pieces of advice',
    topic: '可數/不可數名詞',
    translation: '她給了我兩條打 Boss 的建議。'
  },
  {
    sentence: 'We need a lot of _____ to make glass in Minecraft.',
    blank: 'sand',
    options: ['sand', 'sands', 'a sand', 'the sands'],
    explain: 'sand（沙子）是不可數名詞',
    topic: '可數/不可數名詞',
    translation: '我們需要很多沙子來製作玻璃。'
  },
  // --- 非限定關係子句 ---
  {
    sentence: 'Minecraft, _____ was released in 2011, is still popular today.',
    blank: 'which',
    options: ['which', 'that', 'who', 'what'],
    explain: '非限定關係子句（逗號後）修飾物用 which，不用 that',
    topic: '非限定關係子句',
    translation: 'Minecraft 在 2011 年發行，至今仍然很受歡迎。'
  },
  {
    sentence: 'My friend Alex, _____ loves Roblox, invited me to play.',
    blank: 'who',
    options: ['who', 'which', 'that', 'whom'],
    explain: '非限定關係子句修飾人用 who',
    topic: '非限定關係子句',
    translation: '我的朋友 Alex 很喜歡 Roblox，他邀請我一起玩。'
  },
  {
    sentence: 'The Nether, _____ is full of lava, is very dangerous.',
    blank: 'which',
    options: ['which', 'that', 'where', 'who'],
    explain: '非限定關係子句用 which（不用 that）',
    topic: '非限定關係子句',
    translation: '地獄充滿岩漿，非常危險。'
  },
  // --- 第三條件句 ---
  {
    sentence: 'If I had brought a shield, I _____ not have died.',
    blank: 'would',
    options: ['would', 'will', 'could', 'should'],
    explain: '第三條件句：If + had + p.p., would have + p.p.',
    topic: '第三條件句',
    translation: '如果我帶了盾牌，我就不會死了。'
  },
  {
    sentence: 'If she had saved the game, she would have _____ her progress.',
    blank: 'kept',
    options: ['kept', 'keep', 'keeping', 'keeps'],
    explain: '第三條件句：would have + 過去分詞 (kept)',
    topic: '第三條件句',
    translation: '如果她存了檔，她就不會丟失進度了。'
  },
  {
    sentence: 'We wouldn\'t have lost if we _____ practiced more.',
    blank: 'had',
    options: ['had', 'have', 'has', 'would'],
    explain: '第三條件句：If + had + 過去分詞（與過去事實相反）',
    topic: '第三條件句',
    translation: '如果我們多練習的話，就不會輸了。'
  },
  // --- wish + 過去完成式 ---
  {
    sentence: 'I wish I _____ saved my game before the crash.',
    blank: 'had',
    options: ['had', 'have', 'has', 'would'],
    explain: 'I wish + had + p.p.：表示對過去事實的遺憾',
    topic: '假設語氣',
    translation: '我真希望在遊戲當機前有存檔。'
  },
  {
    sentence: 'She wishes she _____ bought that rare skin when it was on sale.',
    blank: 'had',
    options: ['had', 'has', 'have', 'would'],
    explain: 'wish + had + p.p.：表示過去沒做而後悔',
    topic: '假設語氣',
    translation: '她真希望那個稀有造型特價時有買下來。'
  },
  // --- 分詞構句 ---
  {
    sentence: '_____ in the cave, he found a hidden treasure.',
    blank: 'Exploring',
    options: ['Exploring', 'Explored', 'To explore', 'Explore'],
    explain: '現在分詞構句：Exploring...（當他在探索時）',
    topic: '分詞構句',
    translation: '在洞穴裡探索時，他發現了一個隱藏的寶藏。'
  },
  {
    sentence: '_____ by the explosion, the house collapsed.',
    blank: 'Damaged',
    options: ['Damaged', 'Damaging', 'To damage', 'Damage'],
    explain: '過去分詞構句：表示被動 Damaged by...（被爆炸損壞）',
    topic: '分詞構句',
    translation: '被爆炸損壞後，房子塌了。'
  },
  {
    sentence: '_____ heard the creeper hissing, I ran away immediately.',
    blank: 'Having',
    options: ['Having', 'Have', 'Had', 'Has'],
    explain: '完成分詞構句：Having + p.p.（在…之後）',
    topic: '分詞構句',
    translation: '聽到苦力怕的嘶嘶聲後，我立刻跑了。'
  },
  // --- 形容詞與副詞 ---
  {
    sentence: 'She plays the game _____.',
    blank: 'well',
    options: ['well', 'good', 'better', 'best'],
    explain: 'well 是副詞，修飾動詞 plays；good 是形容詞',
    topic: '形容詞與副詞',
    translation: '她遊戲玩得很好。'
  },
  {
    sentence: 'He ran _____ to escape the zombie.',
    blank: 'quickly',
    options: ['quickly', 'quick', 'quicker', 'quickest'],
    explain: '副詞 quickly 修飾動詞 ran',
    topic: '形容詞與副詞',
    translation: '他跑得很快來逃離殭屍。'
  },
  {
    sentence: 'The new update looks _____!',
    blank: 'amazing',
    options: ['amazing', 'amazingly', 'amazed', 'amaze'],
    explain: 'look 是感官連綴動詞，後接形容詞 amazing',
    topic: '形容詞與副詞',
    translation: '新的更新看起來很棒！'
  },
  // --- 名詞複數 ---
  {
    sentence: 'There are three _____ in the pen.',
    blank: 'sheep',
    options: ['sheep', 'sheeps', 'sheepes', 'sheepies'],
    explain: 'sheep 單複數同形（不規則名詞）',
    topic: '名詞複數',
    translation: '圍欄裡有三隻羊。'
  },
  {
    sentence: 'Two _____ fell into the lava.',
    blank: 'wolves',
    options: ['wolves', 'wolfs', 'wolfes', 'wolf'],
    explain: 'wolf 的複數是 wolves（f → ves）',
    topic: '名詞複數',
    translation: '兩隻狼掉進了岩漿裡。'
  },
  {
    sentence: 'The _____ in this game are really cute.',
    blank: 'children',
    options: ['children', 'childs', 'childrens', 'child'],
    explain: 'child 的複數是 children（不規則變化）',
    topic: '名詞複數',
    translation: '這個遊戲裡的小孩真的很可愛。'
  },
  // --- 過去式（不規則動詞補充）---
  {
    sentence: 'She _____ me how to build a portal.',
    blank: 'taught',
    options: ['taught', 'teached', 'teaching', 'teaches'],
    explain: 'teach 的過去式是 taught（不規則動詞）',
    topic: '過去式',
    translation: '她教了我如何建造傳送門。'
  },
  {
    sentence: 'I _____ my sword fighting the skeleton.',
    blank: 'broke',
    options: ['broke', 'breaked', 'broken', 'breaking'],
    explain: 'break 的過去式是 broke（不規則動詞）',
    topic: '過去式',
    translation: '我在跟骷髏戰鬥時弄壞了我的劍。'
  },
  {
    sentence: 'The ghast _____ a fireball at us.',
    blank: 'threw',
    options: ['threw', 'throwed', 'thrown', 'throwing'],
    explain: 'throw 的過去式是 threw（不規則動詞）',
    topic: '過去式',
    translation: '乾懼者朝我們射了一顆火球。'
  },
  // --- 被動語態（進階）---
  {
    sentence: 'New features are being _____ to the game.',
    blank: 'added',
    options: ['added', 'add', 'adding', 'adds'],
    explain: '現在進行被動：are being + 過去分詞',
    topic: '被動語態',
    translation: '新功能正在被加入遊戲中。'
  },
  {
    sentence: 'The bug will be _____ in the next update.',
    blank: 'fixed',
    options: ['fixed', 'fix', 'fixing', 'fixes'],
    explain: '未來被動：will be + 過去分詞',
    topic: '被動語態',
    translation: '這個 bug 將在下次更新中被修復。'
  },
  {
    sentence: 'The game _____ played by millions of children worldwide.',
    blank: 'is',
    options: ['is', 'are', 'were', 'has'],
    explain: '被動語態：The game（單數）+ is played',
    topic: '被動語態',
    translation: '這個遊戲被全世界數百萬的兒童玩。'
  },
  // --- 不定詞（補充）---
  {
    sentence: 'It is important _____ backup your world regularly.',
    blank: 'to',
    options: ['to', 'for', 'of', 'at'],
    explain: 'It is + 形容詞 + to + V：做…是重要的',
    topic: '不定詞',
    translation: '定期備份你的世界是很重要的。'
  },
  {
    sentence: 'He needs _____ more iron to make a full set of armor.',
    blank: 'to find',
    options: ['to find', 'finding', 'find', 'found'],
    explain: 'need + to + V：需要做…',
    topic: '不定詞',
    translation: '他需要找到更多鐵來做一整套盔甲。'
  },
  {
    sentence: 'She asked me _____ help her build a house.',
    blank: 'to',
    options: ['to', 'for', 'of', 'at'],
    explain: 'ask + 人 + to + V：請求某人做…',
    topic: '不定詞',
    translation: '她請我幫她蓋房子。'
  },
  {
    sentence: 'It took me two hours _____ build this castle.',
    blank: 'to',
    options: ['to', 'for', 'in', 'at'],
    explain: 'It takes + 時間 + to + V：花了…時間做…',
    topic: '不定詞',
    translation: '我花了兩個小時建造這座城堡。'
  },
  {
    sentence: 'I would like _____ try the new game mode.',
    blank: 'to',
    options: ['to', 'for', '--', 'of'],
    explain: 'would like + to + V：想要做…',
    topic: '不定詞',
    translation: '我想試試新的遊戲模式。'
  },
  // --- 動名詞（補充）---
  {
    sentence: 'I don\'t mind _____ you with the build.',
    blank: 'helping',
    options: ['helping', 'help', 'to help', 'helped'],
    explain: 'mind 後面接動名詞 V-ing',
    topic: '動名詞',
    translation: '我不介意幫你建造。'
  },
  {
    sentence: 'We considered _____ to a different server.',
    blank: 'moving',
    options: ['moving', 'move', 'to move', 'moved'],
    explain: 'consider 後面接動名詞 V-ing',
    topic: '動名詞',
    translation: '我們考慮搬到另一個伺服器。'
  },
  // --- 現在簡單式 vs 現在進行式 ---
  {
    sentence: 'She usually _____ Minecraft, but today she is playing Roblox.',
    blank: 'plays',
    options: ['plays', 'is playing', 'play', 'playing'],
    explain: 'usually + 現在簡單式（習慣），today + 現在進行式（此刻）',
    topic: '現在簡單式',
    translation: '她通常玩 Minecraft，但今天她在玩 Roblox。'
  },
  {
    sentence: 'Listen! Someone _____ knocking on the door in the game.',
    blank: 'is',
    options: ['is', 'are', 'does', 'has'],
    explain: 'Listen! 提示正在發生的事，用現在進行式',
    topic: '現在進行式',
    translation: '聽！遊戲裡有人在敲門。'
  },
  // --- 副詞（補充）---
  {
    sentence: 'He has _____ finished building his house.',
    blank: 'just',
    options: ['just', 'yet', 'still', 'ago'],
    explain: 'just 放在助動詞 has 和動詞之間，表示「剛剛」',
    topic: '副詞',
    translation: '他剛剛蓋完他的房子。'
  },
  {
    sentence: 'I _____ play games on weekdays.',
    blank: 'rarely',
    options: ['rarely', 'rare', 'rarer', 'rarest'],
    explain: 'rarely 是頻率副詞，表示「很少」',
    topic: '副詞',
    translation: '我很少在平日打遊戲。'
  },
  // --- 介系詞（補充）---
  {
    sentence: 'I have been playing _____ two hours.',
    blank: 'for',
    options: ['for', 'since', 'during', 'while'],
    explain: 'for + 一段時間（two hours）',
    topic: '介系詞',
    translation: '我已經玩了兩個小時了。'
  },
  {
    sentence: 'She has been streaming _____ this morning.',
    blank: 'since',
    options: ['since', 'for', 'from', 'during'],
    explain: 'since + 時間點（this morning）',
    topic: '介系詞',
    translation: '她從今天早上就開始直播了。'
  },
  {
    sentence: 'The game is different _____ what I expected.',
    blank: 'from',
    options: ['from', 'than', 'to', 'with'],
    explain: 'be different from：和…不同',
    topic: '介系詞',
    translation: '這個遊戲和我預期的不一樣。'
  },
  {
    sentence: 'You should apologize _____ breaking his build.',
    blank: 'for',
    options: ['for', 'to', 'of', 'about'],
    explain: 'apologize for + V-ing：為…道歉',
    topic: '介系詞',
    translation: '你應該為弄壞他的建築道歉。'
  },
  {
    sentence: 'There is no point _____ complaining about the lag.',
    blank: 'in',
    options: ['in', 'of', 'at', 'on'],
    explain: 'There is no point in + V-ing：做…沒有意義',
    topic: '介系詞',
    translation: '抱怨延遲是沒有意義的。'
  },
  // --- 比較級（補充）---
  {
    sentence: 'The _____ you practice, the better you become.',
    blank: 'more',
    options: ['more', 'most', 'much', 'many'],
    explain: 'The + 比較級..., the + 比較級...：越…就越…',
    topic: '比較級',
    translation: '你練習越多，就會變得越好。'
  },
  {
    sentence: 'I play games _____ often than my brother.',
    blank: 'more',
    options: ['more', 'most', 'much', 'many'],
    explain: 'often 的比較級用 more often',
    topic: '比較級',
    translation: '我比我弟弟更常打遊戲。'
  },
  // --- 最高級（補充）---
  {
    sentence: 'He is _____ tallest player on the server.',
    blank: 'the',
    options: ['the', 'a', 'an', '--'],
    explain: '最高級前面要加 the',
    topic: '最高級',
    translation: '他是伺服器上最高的玩家。'
  },
  // --- 現在完成式（補充）---
  {
    sentence: 'I have _____ to that server before.',
    blank: 'been',
    options: ['been', 'being', 'be', 'was'],
    explain: '現在完成式：have been to（曾經去過）',
    topic: '現在完成式',
    translation: '我以前去過那個伺服器。'
  },
  // --- 現在完成進行式（補充）---
  {
    sentence: 'I _____ playing games since I was five years old.',
    blank: 'have been',
    options: ['have been', 'has been', 'am', 'was'],
    explain: '現在完成進行式：have been + V-ing（持續至今的動作）',
    topic: '現在完成進行式',
    translation: '我從五歲就開始玩遊戲了。'
  },
  // --- used to（補充）---
  {
    sentence: 'He is used to _____ late at night.',
    blank: 'gaming',
    options: ['gaming', 'game', 'games', 'gamed'],
    explain: 'be used to + V-ing：習慣做…',
    topic: 'used to',
    translation: '他習慣在深夜打遊戲。'
  },
  // --- 對等連接詞（補充）---
  {
    sentence: 'Not only does he play well, _____ he also teaches others.',
    blank: 'but',
    options: ['but', 'and', 'or', 'so'],
    explain: 'not only...but also：不僅…而且…',
    topic: '對等連接詞',
    translation: '他不僅自己玩得好，而且還教別人。'
  },
  // --- 讓步子句（補充）---
  {
    sentence: '_____ happens, don\'t leave the base.',
    blank: 'Whatever',
    options: ['Whatever', 'Whenever', 'Wherever', 'However'],
    explain: 'Whatever happens：無論發生什麼事',
    topic: '讓步子句',
    translation: '無論發生什麼事，都不要離開基地。'
  },
  // --- 關係子句（補充）---
  {
    sentence: 'This is the place _____ I first spawned.',
    blank: 'where',
    options: ['where', 'which', 'who', 'that'],
    explain: '關係副詞 where 修飾地點 the place',
    topic: '關係子句',
    translation: '這是我第一次出生的地方。'
  },
  {
    sentence: 'The game _____ I was talking about just got an update.',
    blank: 'that',
    options: ['that', 'who', 'where', 'when'],
    explain: '關係代名詞 that 修飾物（the game）',
    topic: '關係子句',
    translation: '我剛才說的那個遊戲剛出了更新。'
  },
  // --- 假設語氣（補充）---
  {
    sentence: 'He speaks English _____ if he were a native speaker.',
    blank: 'as',
    options: ['as', 'like', 'so', 'that'],
    explain: 'as if + 過去式：好像…（假設語氣）',
    topic: '假設語氣',
    translation: '他說英語好像是母語人士一樣。'
  },
  // --- 名詞子句（補充）---
  {
    sentence: 'I\'m not sure _____ to choose the sword or the bow.',
    blank: 'whether',
    options: ['whether', 'if', 'that', 'what'],
    explain: 'whether to + V：是否要…',
    topic: '名詞子句',
    translation: '我不確定要選劍還是弓。'
  },
  {
    sentence: 'He suggested _____ we take a break from the game.',
    blank: 'that',
    options: ['that', 'what', 'which', 'who'],
    explain: 'suggest + that 子句：建議…',
    topic: '名詞子句',
    translation: '他建議我們休息一下不要玩遊戲。'
  },
  // --- 原因子句（補充）---
  {
    sentence: 'We stayed inside _____ there were too many mobs outside.',
    blank: 'because',
    options: ['because', 'although', 'unless', 'while'],
    explain: 'because 引導原因子句：因為…',
    topic: '原因子句',
    translation: '我們待在裡面，因為外面怪物太多了。'
  },
];
