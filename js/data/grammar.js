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
  // === 新增第三批 100 題 ===
  // --- 現在簡單式 ---
  {
    sentence: 'A crafting table _____ you make tools and weapons.',
    blank: 'lets',
    options: ['lets', 'let', 'letting', 'letted'],
    explain: 'A crafting table 是第三人稱單數，用 lets',
    topic: '現在簡單式',
    translation: '工作台讓你製作工具和武器。'
  },
  {
    sentence: 'She always _____ her base before going on adventures.',
    blank: 'organizes',
    options: ['organize', 'organizes', 'organized', 'organizing'],
    explain: '主詞 She（第三人稱單數）+ always（習慣）→ organizes',
    topic: '現在簡單式',
    translation: '她總是在冒險前整理她的基地。'
  },
  {
    sentence: 'Villagers _____ emeralds for useful items.',
    blank: 'trade',
    options: ['trade', 'trades', 'traded', 'trading'],
    explain: 'Villagers 是複數主詞，動詞用原形 trade',
    topic: '現在簡單式',
    translation: '村民用綠寶石交換有用的物品。'
  },
  {
    sentence: 'My dog _____ not attack creepers in Minecraft.',
    blank: 'does',
    options: ['does', 'do', 'is', 'has'],
    explain: '第三人稱單數否定句用 does not',
    topic: '現在簡單式',
    translation: '我的狗在 Minecraft 裡不會攻擊苦力怕。'
  },
  {
    sentence: '_____ she stream on YouTube every Friday?',
    blank: 'Does',
    options: ['Does', 'Do', 'Is', 'Has'],
    explain: '主詞 she 是第三人稱單數，疑問句用 Does',
    topic: '現在簡單式',
    translation: '她每個星期五都在 YouTube 上直播嗎？'
  },
  // --- 過去式 ---
  {
    sentence: 'The spider _____ me from behind the tree.',
    blank: 'attacked',
    options: ['attack', 'attacked', 'attacks', 'attacking'],
    explain: '描述過去已發生的事件，用過去式 attacked',
    topic: '過去式',
    translation: '蜘蛛從樹後面攻擊了我。'
  },
  {
    sentence: 'We _____ all our diamonds when we fell into lava.',
    blank: 'lost',
    options: ['lost', 'lose', 'losed', 'losing'],
    explain: 'lose 的過去式是 lost（不規則動詞）',
    topic: '過去式',
    translation: '我們掉進岩漿時失去了所有的鑽石。'
  },
  {
    sentence: 'He _____ a secret base under the ocean last week.',
    blank: 'discovered',
    options: ['discover', 'discovered', 'discovers', 'discovering'],
    explain: 'last week 表示過去時間，用過去式 discovered',
    topic: '過去式',
    translation: '他上週在海底發現了一個秘密基地。'
  },
  {
    sentence: 'She _____ her first Roblox game when she was ten.',
    blank: 'created',
    options: ['create', 'created', 'creates', 'creating'],
    explain: 'when she was ten 是過去時間，用過去式',
    topic: '過去式',
    translation: '她十歲時創建了她的第一款 Roblox 遊戲。'
  },
  {
    sentence: 'I _____ the answer right away.',
    blank: 'knew',
    options: ['knew', 'knowed', 'know', 'knowing'],
    explain: 'know 的過去式是 knew（不規則動詞）',
    topic: '過去式',
    translation: '我馬上就知道答案了。'
  },
  // --- 現在進行式 ---
  {
    sentence: 'Shh! The baby zombie _____ sneaking up on us!',
    blank: 'is',
    options: ['is', 'are', 'am', 'was'],
    explain: '正在發生的動作，baby zombie（單數）用 is + V-ing',
    topic: '現在進行式',
    translation: '噓！小殭屍正在偷偷靠近我們！'
  },
  {
    sentence: 'We _____ recording a new YouTube video today.',
    blank: 'are',
    options: ['are', 'is', 'am', 'were'],
    explain: '主詞 We 是複數，現在進行式用 are + V-ing',
    topic: '現在進行式',
    translation: '我們今天正在錄製一部新的 YouTube 影片。'
  },
  {
    sentence: 'He _____ not playing right now. He is eating dinner.',
    blank: 'is',
    options: ['is', 'are', 'does', 'has'],
    explain: '現在進行式否定：is not + V-ing',
    topic: '現在進行式',
    translation: '他現在沒有在玩。他正在吃晚餐。'
  },
  {
    sentence: 'My friends _____ waiting for me in the lobby.',
    blank: 'are',
    options: ['are', 'is', 'am', 'was'],
    explain: '主詞 friends 是複數，用 are + V-ing',
    topic: '現在進行式',
    translation: '我的朋友們正在大廳等我。'
  },
  // --- 過去進行式 ---
  {
    sentence: 'What _____ you doing when the server crashed?',
    blank: 'were',
    options: ['were', 'was', 'are', 'did'],
    explain: '主詞 you + 過去進行式疑問句用 were',
    topic: '過去進行式',
    translation: '伺服器當機的時候你在做什麼？'
  },
  {
    sentence: 'He _____ building a bridge when he ran out of blocks.',
    blank: 'was',
    options: ['was', 'were', 'is', 'did'],
    explain: '主詞 He + 過去進行式用 was + V-ing',
    topic: '過去進行式',
    translation: '他正在蓋橋的時候方塊用完了。'
  },
  {
    sentence: 'The villagers _____ trading when the raid started.',
    blank: 'were',
    options: ['were', 'was', 'are', 'did'],
    explain: '主詞 villagers 是複數，過去進行式用 were + V-ing',
    topic: '過去進行式',
    translation: '突襲開始時村民們正在交易。'
  },
  // --- 未來式 ---
  {
    sentence: 'They _____ release a new game mode next month.',
    blank: 'will',
    options: ['will', 'are', 'have', 'did'],
    explain: 'next month 表示未來，用 will + 原形動詞',
    topic: '未來式',
    translation: '他們下個月將推出新的遊戲模式。'
  },
  {
    sentence: 'I _____ going to try speedrunning this weekend.',
    blank: 'am',
    options: ['am', 'is', 'are', 'will'],
    explain: '主詞 I + be going to → am going to（計畫中的未來）',
    topic: '未來式',
    translation: '我這週末打算嘗試速通。'
  },
  {
    sentence: '_____ you be online tonight?',
    blank: 'Will',
    options: ['Will', 'Are', 'Do', 'Have'],
    explain: 'Will you...? 詢問未來的事情',
    topic: '未來式',
    translation: '你今晚會上線嗎？'
  },
  // --- 助動詞 ---
  {
    sentence: 'You _____ eat golden apples to heal quickly.',
    blank: 'can',
    options: ['can', 'must', 'will', 'shall'],
    explain: 'can 表示「可以、能夠」',
    topic: '助動詞',
    translation: '你可以吃金蘋果來快速恢復血量。'
  },
  {
    sentence: 'We _____ not forget to bring food to the Nether.',
    blank: 'must',
    options: ['must', 'can', 'may', 'will'],
    explain: 'must not forget：一定不能忘記',
    topic: '助動詞',
    translation: '我們一定不能忘記帶食物去地獄。'
  },
  {
    sentence: '_____ I borrow your enchanted bow for this fight?',
    blank: 'May',
    options: ['May', 'Will', 'Must', 'Shall'],
    explain: 'May I...? 禮貌請求允許',
    topic: '助動詞',
    translation: '我可以借你的附魔弓來打這場仗嗎？'
  },
  {
    sentence: 'She _____ speak three languages fluently.',
    blank: 'can',
    options: ['can', 'must', 'should', 'will'],
    explain: 'can 表示能力：能夠、會',
    topic: '助動詞',
    translation: '她能流利地說三種語言。'
  },
  // --- 被動語態 ---
  {
    sentence: 'The Ender Dragon can only be _____ in the End.',
    blank: 'found',
    options: ['found', 'find', 'finding', 'finds'],
    explain: '被動語態：can be + 過去分詞',
    topic: '被動語態',
    translation: '終界龍只能在終界找到。'
  },
  {
    sentence: 'Many Roblox games _____ created by young developers.',
    blank: 'are',
    options: ['are', 'is', 'was', 'has'],
    explain: '複數主詞 games + 被動語態用 are + 過去分詞',
    topic: '被動語態',
    translation: '很多 Roblox 遊戲是由年輕開發者創建的。'
  },
  {
    sentence: 'The castle was _____ overnight by the entire team.',
    blank: 'built',
    options: ['built', 'build', 'building', 'builds'],
    explain: '被動語態：was + 過去分詞 built',
    topic: '被動語態',
    translation: '這座城堡是整個團隊在一夜之間建成的。'
  },
  {
    sentence: 'The rules should be _____ by all players.',
    blank: 'followed',
    options: ['followed', 'follow', 'following', 'follows'],
    explain: '被動語態 + 助動詞：should be + 過去分詞',
    topic: '被動語態',
    translation: '所有玩家都應該遵守規則。'
  },
  // --- 比較級 ---
  {
    sentence: 'Netherite armor is _____ than diamond armor.',
    blank: 'better',
    options: ['better', 'gooder', 'more good', 'best'],
    explain: 'good 的比較級是 better（不規則變化）',
    topic: '比較級',
    translation: '獄髓盔甲比鑽石盔甲更好。'
  },
  {
    sentence: 'Playing with friends is _____ enjoyable than playing alone.',
    blank: 'more',
    options: ['more', 'most', 'much', 'very'],
    explain: 'enjoyable 是長形容詞，比較級用 more + 形容詞',
    topic: '比較級',
    translation: '跟朋友一起玩比獨自玩更有樂趣。'
  },
  {
    sentence: 'This server has _____ players than the other one.',
    blank: 'fewer',
    options: ['fewer', 'less', 'lesser', 'few'],
    explain: 'players 是可數名詞，用 fewer（不用 less）',
    topic: '比較級',
    translation: '這個伺服器的玩家比另一個少。'
  },
  {
    sentence: 'The boss fight was much _____ than I expected.',
    blank: 'harder',
    options: ['harder', 'more hard', 'hardest', 'hard'],
    explain: 'hard → harder（短形容詞加 -er）',
    topic: '比較級',
    translation: '打 Boss 比我預期的難得多。'
  },
  // --- 最高級 ---
  {
    sentence: 'The Wither is one of the _____ bosses in the game.',
    blank: 'toughest',
    options: ['toughest', 'tougher', 'tough', 'more tough'],
    explain: 'one of the + 最高級 + 複數名詞',
    topic: '最高級',
    translation: '乾燥者是遊戲中最難打的 Boss 之一。'
  },
  {
    sentence: 'That was the _____ exciting match we have ever played.',
    blank: 'most',
    options: ['most', 'more', 'much', 'very'],
    explain: 'exciting 是長形容詞，最高級用 the most',
    topic: '最高級',
    translation: '那是我們玩過最刺激的比賽。'
  },
  {
    sentence: 'He is the _____ builder on our team.',
    blank: 'best',
    options: ['best', 'better', 'good', 'most good'],
    explain: 'good 的最高級是 best（不規則變化）',
    topic: '最高級',
    translation: '他是我們隊上最厲害的建築師。'
  },
  // --- 現在完成式 ---
  {
    sentence: 'Have you ever _____ a dragon in a game?',
    blank: 'defeated',
    options: ['defeated', 'defeat', 'defeating', 'defeats'],
    explain: '現在完成式疑問句：Have you ever + 過去分詞',
    topic: '現在完成式',
    translation: '你有在遊戲裡打敗過龍嗎？'
  },
  {
    sentence: 'She has _____ over 200 videos on her channel.',
    blank: 'uploaded',
    options: ['uploaded', 'upload', 'uploading', 'uploads'],
    explain: '現在完成式：has + 過去分詞',
    topic: '現在完成式',
    translation: '她已經在她的頻道上傳了超過 200 支影片。'
  },
  {
    sentence: 'We have not _____ that dungeon yet.',
    blank: 'explored',
    options: ['explored', 'explore', 'exploring', 'explores'],
    explain: '現在完成式否定：have not + 過去分詞',
    topic: '現在完成式',
    translation: '我們還沒探索過那個地牢。'
  },
  {
    sentence: 'How many times _____ he died in this level?',
    blank: 'has',
    options: ['has', 'have', 'did', 'does'],
    explain: '現在完成式疑問句：How many times has he + 過去分詞',
    topic: '現在完成式',
    translation: '他在這關死了幾次？'
  },
  // --- 條件句 ---
  {
    sentence: 'If you _____ the beacon, you will get special powers.',
    blank: 'activate',
    options: ['activate', 'activated', 'activates', 'will activate'],
    explain: '第一條件句：If + 現在式, will + 原形',
    topic: '條件句',
    translation: '如果你啟動信標，你就會獲得特殊能力。'
  },
  {
    sentence: 'If I _____ you, I would use a shield.',
    blank: 'were',
    options: ['were', 'was', 'am', 'is'],
    explain: '第二條件句假設語氣：If I were you（不論人稱都用 were）',
    topic: '條件句',
    translation: '如果我是你，我會使用盾牌。'
  },
  {
    sentence: 'If we _____ harder, we would have won the tournament.',
    blank: 'had trained',
    options: ['had trained', 'trained', 'train', 'will train'],
    explain: '第三條件句：If + had + p.p.（與過去事實相反）',
    topic: '條件句',
    translation: '如果我們訓練更努力，就會贏得錦標賽了。'
  },
  {
    sentence: '_____ you press that button, the TNT will explode.',
    blank: 'If',
    options: ['If', 'Unless', 'Although', 'While'],
    explain: 'If 引導條件子句：如果…',
    topic: '條件句',
    translation: '如果你按那個按鈕，TNT 就會爆炸。'
  },
  // --- 不定詞 ---
  {
    sentence: 'It is easy _____ get lost in this map.',
    blank: 'to',
    options: ['to', 'for', 'at', 'in'],
    explain: 'It is + 形容詞 + to + V：做…是容易的',
    topic: '不定詞',
    translation: '在這張地圖上很容易迷路。'
  },
  {
    sentence: 'He wants his friends _____ join the server.',
    blank: 'to',
    options: ['to', 'for', '--', 'of'],
    explain: 'want + 人 + to + V：想要某人做…',
    topic: '不定詞',
    translation: '他想要他的朋友們加入伺服器。'
  },
  {
    sentence: 'She was the first person _____ complete the quest.',
    blank: 'to',
    options: ['to', 'for', 'who', 'that'],
    explain: '序數詞 + 名詞 + to + V：第一個做…的人',
    topic: '不定詞',
    translation: '她是第一個完成任務的人。'
  },
  {
    sentence: 'I went to the Nether _____ find blaze rods.',
    blank: 'to',
    options: ['to', 'for', 'so', 'that'],
    explain: 'to + V 表示目的：為了…',
    topic: '不定詞',
    translation: '我去地獄是為了找烈焰棒。'
  },
  // --- 動名詞 ---
  {
    sentence: '_____ building without a plan usually leads to a mess.',
    blank: 'Starting',
    options: ['Starting', 'Start', 'To starting', 'Started'],
    explain: '動名詞當主詞：Starting building...（開始建造這件事）',
    topic: '動名詞',
    translation: '沒有計畫就開始建造通常會一團糟。'
  },
  {
    sentence: 'I can\'t help _____ when I see a cute axolotl.',
    blank: 'smiling',
    options: ['smiling', 'smile', 'to smile', 'smiled'],
    explain: 'can\'t help + V-ing：忍不住做…',
    topic: '動名詞',
    translation: '我看到可愛的美西螈就忍不住微笑。'
  },
  {
    sentence: 'He is interested in _____ new game mechanics.',
    blank: 'learning',
    options: ['learning', 'learn', 'to learn', 'learned'],
    explain: '介系詞 in 後面接動名詞 V-ing',
    topic: '動名詞',
    translation: '他對學習新的遊戲機制很有興趣。'
  },
  {
    sentence: 'Would you mind _____ the door in the game?',
    blank: 'opening',
    options: ['opening', 'open', 'to open', 'opened'],
    explain: 'mind 後面接動名詞 V-ing',
    topic: '動名詞',
    translation: '你介意在遊戲裡把門打開嗎？'
  },
  // --- 關係子句 ---
  {
    sentence: 'The YouTuber _____ I watch has 10 million subscribers.',
    blank: 'that',
    options: ['that', 'who', 'where', 'when'],
    explain: '關係代名詞 that 可修飾人（作受詞時）',
    topic: '關係子句',
    translation: '我看的那個 YouTuber 有一千萬訂閱者。'
  },
  {
    sentence: 'I remember the day _____ I first played Minecraft.',
    blank: 'when',
    options: ['when', 'where', 'which', 'who'],
    explain: '關係副詞 when 修飾時間 the day',
    topic: '關係子句',
    translation: '我記得我第一次玩 Minecraft 的那天。'
  },
  {
    sentence: 'The world _____ he created is absolutely stunning.',
    blank: 'that',
    options: ['that', 'where', 'who', 'when'],
    explain: '關係代名詞 that 修飾物（the world）',
    topic: '關係子句',
    translation: '他創造的那個世界非常驚人。'
  },
  {
    sentence: 'Do you know the reason _____ he quit the game?',
    blank: 'why',
    options: ['why', 'which', 'who', 'where'],
    explain: '關係副詞 why 修飾原因 the reason',
    topic: '關係子句',
    translation: '你知道他為什麼退出遊戲嗎？'
  },
  // --- 介系詞 ---
  {
    sentence: 'She is afraid _____ the Enderman.',
    blank: 'of',
    options: ['of', 'at', 'to', 'in'],
    explain: 'be afraid of：害怕…',
    topic: '介系詞',
    translation: '她害怕乾燥者。'
  },
  {
    sentence: 'He is responsible _____ protecting our base.',
    blank: 'for',
    options: ['for', 'of', 'to', 'at'],
    explain: 'be responsible for：負責…',
    topic: '介系詞',
    translation: '他負責保護我們的基地。'
  },
  {
    sentence: 'I am tired _____ losing the same level over and over.',
    blank: 'of',
    options: ['of', 'at', 'in', 'to'],
    explain: 'be tired of：厭倦了…',
    topic: '介系詞',
    translation: '我厭倦了一直輸在同一關。'
  },
  {
    sentence: 'He succeeded _____ defeating the final boss.',
    blank: 'in',
    options: ['in', 'at', 'on', 'to'],
    explain: 'succeed in + V-ing：成功做到…',
    topic: '介系詞',
    translation: '他成功打敗了最終 Boss。'
  },
  {
    sentence: 'She congratulated me _____ winning the competition.',
    blank: 'on',
    options: ['on', 'for', 'at', 'in'],
    explain: 'congratulate + 人 + on：祝賀某人…',
    topic: '介系詞',
    translation: '她恭喜我贏得比賽。'
  },
  // --- 連接詞 ---
  {
    sentence: 'We kept playing _____ it was very late at night.',
    blank: 'even though',
    options: ['even though', 'because', 'so', 'unless'],
    explain: 'even though 表示「即使」（讓步）',
    topic: '連接詞',
    translation: '即使夜很深了，我們還是繼續玩。'
  },
  {
    sentence: 'I will lend you my sword _____ you promise to return it.',
    blank: 'as long as',
    options: ['as long as', 'unless', 'although', 'because'],
    explain: 'as long as：只要…',
    topic: '連接詞',
    translation: '只要你答應會還，我就借你我的劍。'
  },
  {
    sentence: 'He saved the game _____ case the power went out.',
    blank: 'in',
    options: ['in', 'on', 'at', 'by'],
    explain: 'in case：以防萬一',
    topic: '連接詞',
    translation: '他存了檔，以防停電。'
  },
  {
    sentence: '_____ he is young, he is already a great builder.',
    blank: 'Although',
    options: ['Although', 'Because', 'If', 'When'],
    explain: 'Although 表示「雖然」',
    topic: '連接詞',
    translation: '雖然他很年輕，但他已經是很厲害的建築師了。'
  },
  // --- 代名詞 ---
  {
    sentence: 'She and _____ are playing on the same team.',
    blank: 'I',
    options: ['I', 'me', 'my', 'mine'],
    explain: '主格代名詞：She and I（作主詞）',
    topic: '代名詞',
    translation: '她和我在同一隊。'
  },
  {
    sentence: 'The teacher gave _____ extra homework because we were late.',
    blank: 'us',
    options: ['us', 'we', 'our', 'ours'],
    explain: 'gave 後面接受格 us（受詞）',
    topic: '代名詞',
    translation: '老師因為我們遲到給了我們額外的作業。'
  },
  {
    sentence: 'Is this your pickaxe? — No, _____ is in the chest.',
    blank: 'mine',
    options: ['mine', 'my', 'me', 'I'],
    explain: '所有格代名詞 mine = my pickaxe',
    topic: '代名詞',
    translation: '這是你的鎬嗎？——不是，我的在箱子裡。'
  },
  // --- 片語動詞 ---
  {
    sentence: 'I ran _____ of arrows during the fight.',
    blank: 'out',
    options: ['out', 'off', 'up', 'away'],
    explain: 'run out of：用完、耗盡',
    topic: '片語動詞',
    translation: '我在戰鬥中把箭用完了。'
  },
  {
    sentence: 'Can you _____ after my pet while I\'m away?',
    blank: 'look',
    options: ['look', 'take', 'watch', 'see'],
    explain: 'look after：照顧',
    topic: '片語動詞',
    translation: '我不在的時候你能照顧我的寵物嗎？'
  },
  {
    sentence: 'He _____ out the fire with a water bucket.',
    blank: 'put',
    options: ['put', 'set', 'took', 'gave'],
    explain: 'put out：撲滅（火）',
    topic: '片語動詞',
    translation: '他用水桶撲滅了火。'
  },
  {
    sentence: 'We need to _____ up early to join the server event.',
    blank: 'get',
    options: ['get', 'wake', 'stand', 'set'],
    explain: 'get up：起床',
    topic: '片語動詞',
    translation: '我們需要早起才能參加伺服器活動。'
  },
  {
    sentence: 'She _____ down the offer to join their team.',
    blank: 'turned',
    options: ['turned', 'put', 'took', 'let'],
    explain: 'turn down：拒絕',
    topic: '片語動詞',
    translation: '她拒絕了加入他們隊伍的邀請。'
  },
  // --- 附加問句 ---
  {
    sentence: 'They have finished the quest, _____ they?',
    blank: 'haven\'t',
    options: ['haven\'t', 'have', 'don\'t', 'didn\'t'],
    explain: '肯定句（have finished）+ 否定附加問句：haven\'t they?',
    topic: '附加問句',
    translation: '他們已經完成任務了，對吧？'
  },
  {
    sentence: 'He won\'t cheat, _____ he?',
    blank: 'will',
    options: ['will', 'won\'t', 'does', 'is'],
    explain: '否定句（won\'t）+ 肯定附加問句：will he?',
    topic: '附加問句',
    translation: '他不會作弊，對吧？'
  },
  {
    sentence: 'You went to the Nether, _____ you?',
    blank: 'didn\'t',
    options: ['didn\'t', 'did', 'don\'t', 'weren\'t'],
    explain: '肯定過去式句 + 否定附加問句：didn\'t you?',
    topic: '附加問句',
    translation: '你去了地獄，對吧？'
  },
  // --- 間接引語 ---
  {
    sentence: 'She said she _____ come to play tomorrow.',
    blank: 'would',
    options: ['would', 'will', 'can', 'is'],
    explain: '間接引語時態後移：will → would',
    topic: '間接引語',
    translation: '她說她明天會來玩。'
  },
  {
    sentence: 'He told us that he _____ already finished the level.',
    blank: 'had',
    options: ['had', 'has', 'have', 'did'],
    explain: '間接引語時態後移：has finished → had finished',
    topic: '間接引語',
    translation: '他告訴我們他已經通過那一關了。'
  },
  {
    sentence: 'They asked us _____ we could help with the build.',
    blank: 'if',
    options: ['if', 'that', 'what', 'how'],
    explain: '間接引語的 Yes/No 問句用 if/whether',
    topic: '間接引語',
    translation: '他們問我們能不能幫忙建造。'
  },
  // --- 冠詞 ---
  {
    sentence: 'I need _____ iron ingot to craft a shield.',
    blank: 'an',
    options: ['an', 'a', 'the', '--'],
    explain: 'iron 以母音開頭，用 an',
    topic: '冠詞',
    translation: '我需要一個鐵錠來製作盾牌。'
  },
  {
    sentence: '_____ moon in Minecraft does not affect gameplay.',
    blank: 'The',
    options: ['The', 'A', 'An', '--'],
    explain: '特定的唯一事物（月亮）用 the',
    topic: '冠詞',
    translation: 'Minecraft 裡的月亮不會影響遊戲玩法。'
  },
  {
    sentence: 'She wants to become _____ professional gamer.',
    blank: 'a',
    options: ['a', 'an', 'the', '--'],
    explain: 'professional 以子音開頭，用 a',
    topic: '冠詞',
    translation: '她想成為一名職業玩家。'
  },
  // --- There is/are ---
  {
    sentence: 'There _____ a secret passage behind the bookshelf.',
    blank: 'is',
    options: ['is', 'are', 'were', 'have'],
    explain: '單數名詞 a secret passage 用 there is',
    topic: 'There is/are',
    translation: '書架後面有一條密道。'
  },
  {
    sentence: 'There _____ too many enemies in this room!',
    blank: 'are',
    options: ['are', 'is', 'was', 'has'],
    explain: '複數名詞 enemies 用 there are',
    topic: 'There is/are',
    translation: '這個房間裡敵人太多了！'
  },
  // --- 感嘆句 ---
  {
    sentence: '_____ amazing this build looks!',
    blank: 'How',
    options: ['How', 'What', 'Which', 'Where'],
    explain: 'How + 形容詞：多麼…！',
    topic: '感嘆句',
    translation: '這個建築看起來多麼驚人啊！'
  },
  {
    sentence: '_____ a clever strategy that was!',
    blank: 'What',
    options: ['What', 'How', 'Which', 'When'],
    explain: 'What + a/an + 形容詞 + 名詞：多麼…的…！',
    topic: '感嘆句',
    translation: '那是多麼聰明的策略啊！'
  },
  // --- 祈使句 ---
  {
    sentence: '_____ me your coordinates so I can find you.',
    blank: 'Tell',
    options: ['Tell', 'Tells', 'Telling', 'Told'],
    explain: '祈使句用原形動詞開頭',
    topic: '祈使句',
    translation: '告訴我你的座標，這樣我才能找到你。'
  },
  {
    sentence: '_____ run near the edge. You might fall!',
    blank: 'Don\'t',
    options: ['Don\'t', 'Not', 'Doesn\'t', 'Isn\'t'],
    explain: '否定祈使句：Don\'t + 原形動詞',
    topic: '祈使句',
    translation: '不要在邊緣附近跑。你可能會掉下去！'
  },
  // --- 數量詞 ---
  {
    sentence: 'There is _____ food left. We need to find more.',
    blank: 'little',
    options: ['little', 'few', 'a little', 'a few'],
    explain: 'little + 不可數名詞：很少（幾乎沒有）',
    topic: '數量詞',
    translation: '食物所剩無幾了。我們需要找更多。'
  },
  {
    sentence: 'A _____ players have already reached the final level.',
    blank: 'few',
    options: ['few', 'little', 'lot', 'much'],
    explain: 'a few + 可數名詞複數：一些',
    topic: '數量詞',
    translation: '已經有一些玩家到達最後一關了。'
  },
  {
    sentence: 'She doesn\'t have _____ experience in PvP battles.',
    blank: 'much',
    options: ['much', 'many', 'a lot', 'few'],
    explain: 'experience 是不可數名詞，否定句用 much',
    topic: '數量詞',
    translation: '她在 PvP 戰鬥方面沒有很多經驗。'
  },
  // --- 時間連接詞 ---
  {
    sentence: '_____ the sun sets in Minecraft, monsters start spawning.',
    blank: 'When',
    options: ['When', 'Until', 'Before', 'Unless'],
    explain: 'When 表示「當…的時候」',
    topic: '時間連接詞',
    translation: '當 Minecraft 裡太陽下山時，怪物就會開始生成。'
  },
  {
    sentence: 'Don\'t open that door _____ I say so.',
    blank: 'until',
    options: ['until', 'when', 'after', 'while'],
    explain: 'until 表示「直到…為止」',
    topic: '時間連接詞',
    translation: '在我說可以之前不要打開那扇門。'
  },
  {
    sentence: 'I\'ll finish my homework _____ I play any games.',
    blank: 'before',
    options: ['before', 'after', 'while', 'when'],
    explain: 'before 表示「在…之前」',
    topic: '時間連接詞',
    translation: '我會在玩任何遊戲之前先寫完作業。'
  },
  // --- 名詞子句 ---
  {
    sentence: '_____ he said surprised everyone on the server.',
    blank: 'What',
    options: ['What', 'That', 'Which', 'Who'],
    explain: 'What 引導名詞子句當主詞：他所說的話',
    topic: '名詞子句',
    translation: '他說的話讓伺服器上的每個人都很驚訝。'
  },
  {
    sentence: 'I believe _____ practice makes perfect.',
    blank: 'that',
    options: ['that', 'what', 'which', 'who'],
    explain: 'believe + that 子句：相信…',
    topic: '名詞子句',
    translation: '我相信熟能生巧。'
  },
  // --- 使役動詞 ---
  {
    sentence: 'The teacher had the students _____ a presentation about their game.',
    blank: 'give',
    options: ['give', 'to give', 'giving', 'gave'],
    explain: 'have + 受詞 + 原形動詞',
    topic: '使役動詞',
    translation: '老師讓學生們做一個關於他們遊戲的報告。'
  },
  {
    sentence: 'My parents won\'t let me _____ games on school nights.',
    blank: 'play',
    options: ['play', 'to play', 'playing', 'played'],
    explain: 'let + 受詞 + 原形動詞',
    topic: '使役動詞',
    translation: '我父母不讓我在上學日的晚上玩遊戲。'
  },
  // --- 感官動詞 ---
  {
    sentence: 'I can feel the controller _____.',
    blank: 'vibrating',
    options: ['vibrating', 'to vibrate', 'vibrate', 'vibrated'],
    explain: '感官動詞 feel + 受詞 + V-ing（強調正在進行）',
    topic: '感官動詞',
    translation: '我可以感覺到搖桿在震動。'
  },
  {
    sentence: 'We watched him _____ the entire level without dying.',
    blank: 'complete',
    options: ['complete', 'to complete', 'completing', 'completed'],
    explain: '感官動詞 watch + 受詞 + 原形動詞（看到整個過程）',
    topic: '感官動詞',
    translation: '我們看著他在沒有死亡的情況下通過了整個關卡。'
  },
  // --- 主詞動詞一致 ---
  {
    sentence: 'The number of online players _____ increasing every day.',
    blank: 'is',
    options: ['is', 'are', 'were', 'have'],
    explain: 'The number of... 主詞是 number（單數），用 is',
    topic: '主詞動詞一致',
    translation: '線上玩家的數量每天都在增加。'
  },
  {
    sentence: 'A group of friends _____ playing together in the lobby.',
    blank: 'is',
    options: ['is', 'are', 'were', 'has'],
    explain: 'A group of... 主詞是 group（單數集合名詞），用 is',
    topic: '主詞動詞一致',
    translation: '一群朋友正在大廳裡一起玩。'
  },
  // --- too...to / enough ---
  {
    sentence: 'He is not old _____ to play this game.',
    blank: 'enough',
    options: ['enough', 'too', 'very', 'so'],
    explain: '形容詞 + enough + to + V：足夠…以至於能',
    topic: 'too...to / enough',
    translation: '他年紀不夠大，不能玩這個遊戲。'
  },
  {
    sentence: 'The puzzle was too _____ for me to solve.',
    blank: 'difficult',
    options: ['difficult', 'difficultly', 'difficulty', 'difficulties'],
    explain: 'too + 形容詞 + for + 人 + to + V',
    topic: 'too...to / enough',
    translation: '這個謎題對我來說太難了，解不出來。'
  },
  // --- 分詞構句 ---
  {
    sentence: '_____ by curiosity, she entered the dark cave.',
    blank: 'Driven',
    options: ['Driven', 'Driving', 'Drive', 'Drove'],
    explain: '過去分詞構句（被動）：Driven by...（被好奇心驅使）',
    topic: '分詞構句',
    translation: '在好奇心的驅使下，她進入了黑暗的洞穴。'
  },
  {
    sentence: '_____ at the screen for hours, his eyes got tired.',
    blank: 'Staring',
    options: ['Staring', 'Stared', 'To stare', 'Stare'],
    explain: '現在分詞構句：Staring...（因為盯著螢幕看）',
    topic: '分詞構句',
    translation: '盯著螢幕看了好幾個小時，他的眼睛累了。'
  },
  // --- 附和句 ---
  {
    sentence: 'I don\'t like losing. — Neither _____ I.',
    blank: 'do',
    options: ['do', 'am', 'can', 'have'],
    explain: 'Neither do I：我也不喜歡（附和否定句，一般動詞用 do）',
    topic: '附和句',
    translation: '我不喜歡輸。——我也不喜歡。'
  },
  {
    sentence: 'She is a great gamer. — So _____ he.',
    blank: 'is',
    options: ['is', 'does', 'has', 'can'],
    explain: 'So is he：他也是（附和 be 動詞肯定句用 is）',
    topic: '附和句',
    translation: '她是很厲害的玩家。——他也是。'
  },
  // --- would rather / had better ---
  {
    sentence: 'You\'d better _____ your password to anyone.',
    blank: 'not give',
    options: ['not give', 'not to give', 'don\'t give', 'not giving'],
    explain: 'had better not + 原形動詞：最好不要…',
    topic: 'would rather / had better',
    translation: '你最好不要把密碼給任何人。'
  },
  {
    sentence: 'I\'d rather _____ at home and play games today.',
    blank: 'stay',
    options: ['stay', 'staying', 'to stay', 'stayed'],
    explain: 'would rather + 原形動詞：寧願…',
    topic: 'would rather / had better',
    translation: '我今天寧願待在家裡打遊戲。'
  },
  // --- 情態動詞 ---
  {
    sentence: 'You _____ have told me about the secret room earlier!',
    blank: 'should',
    options: ['should', 'might', 'will', 'can'],
    explain: 'should have + p.p.：你本來應該…（責備過去沒做的事）',
    topic: '情態動詞',
    translation: '你應該早點告訴我秘密房間的！'
  },
  {
    sentence: 'She _____ have been the one who built this.',
    blank: 'must',
    options: ['must', 'can', 'will', 'shall'],
    explain: 'must have + p.p.：一定已經…（對過去的肯定推測）',
    topic: '情態動詞',
    translation: '建造這個的人一定是她。'
  },
];
