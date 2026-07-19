/* ===== 偵探社擴充包 #3 (英語偵探社) — 進階案件 25-36「特別調查組」前半 =====
   12 new cases (25-36) pushed after js/data/detective2.js's 24 cases.
   These are ADVANCED cases (adv: true): passages run 5-7 sentences, liar
   statements are cross-checked against time+place facts, and code answers
   are 6-8 letters. Each case adds two NEW room types beyond the original
   four (see detective.js's header for read/liar/code/witness):
     timeline — { type:'timeline', introZh, events:[4 EN sentences in
       shuffled display order], order:[4 indexes giving the true
       chronological order, never identity], explainZh, clueZh }
     alibi    — { type:'alibi', factZh (a concrete time/place fact),
       suspects:[3 x {emoji,name,alibiEn}], a (index whose stated alibi
       is contradicted by factZh), explainZh, clueZh }
   Every case has exactly 8 rooms covering all 6 types (order varies).
   STORYLINE: a mysterious phantom thief nicknamed "午夜貓影" (Midnight
   Cat Shadow) haunts the edges of every case in this pack. The culprit
   solved in each case's rooms is always an ordinary person with a warm,
   human motive (jealousy, curiosity, a guilty secret) — but the crime
   scene always carries a separate trace of the phantom's passing. Each
   case's `arcZh` (shown once the case is solved) reveals one new trait
   of the phantom, building cumulatively toward cases 37-48.
*/

DETECTIVE_CASES.push(
  // ===== Case 25: 美術館之夜 =====
  {
    id: 'sp_gallery_night',
    title: '美術館之夜',
    icon: '🖼️',
    sceneZh: '市立美術館舉辦「貓與月光」夜間特展，閉館後保全巡邏時發現一枚鑲著藍寶石的古董胸針從展示櫃中消失，玻璃櫃卻完好無損。到底是誰打開了那道鎖？',
    adv: true,
    arcZh: '案子結束後，保全隊長翻看這幾天的巡邏紀錄，才注意到一件怪事——不管是這次還是先前幾起小案子，那個神秘黑影從來不曾在白天出現過，總是等到夜深人靜才會現身。',
    rooms: [
      {
        type: 'read',
        textEn: "Aunt Hui cleans the gallery every night after it closes at nine o'clock. She always starts in the east wing and finishes in the west wing by ten thirty. Last night, she followed her usual route and mopped every hallway one by one. When she reached the cat exhibit room, it was already ten fifteen, and she saw the brooch case was still locked and shining under the lights. She finished her work at ten thirty and went straight home. She never went back to the gallery after that.",
        question: 'Where did Aunt Hui go after she reached the cat exhibit room?',
        options: ['She finished cleaning and went home.', 'She stayed to guard the brooch case.', 'She called the security intern.'],
        a: 0,
        explainZh: '文章寫 she finished her work at ten thirty and went home，還提到 never went back，可以排除她的嫌疑。',
        clueZh: '慧姐清潔時十點十五分才經過胸針展示櫃，當時完好無缺，十點半就直接回家了，可以排除她的嫌疑。',
      },
      {
        type: 'witness',
        descEn: "This person wears a security intern's cap. He was seen crouching near the brooch display case around eleven o'clock, holding a small flashlight close to the glass.",
        options: [
          { emoji: '🧑‍💼', label: '阿哲' },
          { emoji: '🧹', label: '慧姐' },
          { emoji: '👨‍🎨', label: '老修復師' },
          { emoji: '👩', label: '阿妍' },
        ],
        a: 0,
        explainZh: "security intern's cap、crouching near the case、eleven o'clock、flashlight——都指向實習保全阿哲。",
        clueZh: '有人看到一位戴著實習保全帽子的男生，晚上十一點左右蹲在展示櫃旁，拿著小手電筒靠近玻璃檢查。',
      },
      {
        type: 'liar',
        factZh: '保全打卡紀錄顯示，阿哲昨晚十一點整曾經打卡「巡邏東翼」，但監視器同時拍到他人卻站在西翼的貓展區展示櫃前。',
        statements: [
          { speaker: '🧑‍💼 阿哲', textEn: "I was patrolling the east wing at eleven o'clock last night." },
          { speaker: '👩 阿妍', textEn: "I left the gallery right after the volunteer shift ended at nine thirty." },
          { speaker: '👨‍🎨 老修復師', textEn: 'I was cleaning my brushes in the restoration room until midnight.' },
        ],
        a: 0,
        explainZh: '監視器清楚拍到阿哲十一點時人在西翼的展示櫃前，他卻打卡宣稱自己在東翼巡邏，時間地點都對不上，證明他說謊了。',
        clueZh: '阿哲聲稱十一點在東翼巡邏，但監視器卻拍到他當時人在西翼的展示櫃前，說法完全矛盾。',
      },
      {
        type: 'code',
        riddleEn: 'I am a small piece of jewelry. People pin me onto a jacket or a scarf. I often sparkle with a tiny gemstone.',
        answer: 'BROOCH',
        letterBank: ['B', 'R', 'O', 'O', 'C', 'H', 'T', 'S', 'A', 'N'],
        explainZh: '謎題描述「小小的珠寶、別在外套或圍巾上、常鑲著一顆閃亮的寶石」——答案是 brooch（胸針），正是這次消失的古董胸針！',
        clueZh: '展示櫃內側，工作人員發現了一小片別針扣環的碎屑，證實胸針曾在這裡被匆忙拆下。',
      },
      {
        type: 'timeline',
        introZh: '警衛把昨晚十點到十二點之間發生的事件通通記錄下來，但順序被打亂了，請依照真正發生的先後排列。',
        events: [
          'Aunt Hui finished cleaning and went home at ten thirty.',
          'The night guard heard a soft click near the brooch case at eleven fifteen.',
          "Security intern Jhe clocked in for the 'east wing' patrol at eleven o'clock.",
          'The morning staff discovered the brooch was missing at eight o\'clock.',
        ],
        order: [0, 2, 1, 3],
        explainZh: '先是十點半慧姐清潔完回家，接著十一點阿哲打卡巡邏，十一點十五分警衛聽到喀嚓聲，隔天早上八點才被發現遺失——按照時間排列就能還原整個經過。',
        clueZh: '依照事件發生順序拼湊時間軸後發現，喀嚓聲出現在阿哲打卡「巡邏東翼」之後短短十五分鐘內，時間點完全吻合。',
      },
      {
        type: 'alibi',
        factZh: '監視器畫面顯示，貓展區走廊的感應燈只有在「西翼」的展示櫃走道才會被觸發，觸發後燈光會閃爍三秒，昨晚十點四十五分就曾經觸發過一次。',
        suspects: [
          { emoji: '👨‍🎨', name: '老修復師', alibiEn: 'I stayed in the restoration room in the east wing all night and never crossed to the west wing.' },
          { emoji: '👩', name: '阿妍', alibiEn: 'I left the building at nine thirty, long before ten forty-five.' },
          { emoji: '🧑‍💼', name: '阿哲', alibiEn: 'I was resetting the fuse box in the east wing at ten forty-five last night.' },
        ],
        a: 2,
        explainZh: '感應燈只有在西翼展示櫃走道才會被觸發，阿哲卻說自己十點四十五分人在「東翼」修保險絲，這和感應燈觸發的地點矛盾，證明他的說法不成立。',
        clueZh: '阿哲聲稱十點四十五分人在東翼修保險絲，但觸發感應燈的位置其實是西翼展示櫃走道，他的不在場證明根本兜不攏。',
      },
      {
        type: 'witness',
        descEn: 'A trail of small round mud prints was seen leading straight from the brooch case to the staff locker room. The prints matched a size-39 sneaker.',
        options: [
          { emoji: '🧑‍💼', label: '阿哲' },
          { emoji: '🧹', label: '慧姐' },
          { emoji: '👨‍🎨', label: '老修復師' },
          { emoji: '👩', label: '阿妍' },
        ],
        a: 0,
        explainZh: '泥印一路通往展示櫃又折返到員工置物櫃，鞋印尺寸吻合阿哲的球鞋。',
        clueZh: '從展示櫃到員工置物櫃之間，發現一連串圓形小泥印，鞋印尺寸正好是阿哲的尺碼。',
      },
      {
        type: 'liar',
        factZh: '員工置物櫃的登記簿顯示，阿哲的置物櫃鑰匙昨晚十一點半才被歸還到值班室，但阿哲卻堅稱自己十點就已經把鑰匙還回去，並直接下班回家。',
        statements: [
          { speaker: '🧑‍💼 阿哲', textEn: 'I returned my locker key at ten o\'clock and went straight home after that.' },
          { speaker: '👩 阿妍', textEn: "I don't have a locker key because volunteers don't get one." },
          { speaker: '👨‍🎨 老修復師', textEn: 'I keep my studio key with me and never use the staff locker room.' },
        ],
        a: 0,
        explainZh: '登記簿清楚記錄鑰匙十一點半才歸還，阿哲卻說自己十點就還了鑰匙並下班，時間對不上，證明他在說謊。',
        clueZh: '阿哲聲稱十點就歸還鑰匙下班，但登記簿卻顯示鑰匙十一點半才被歸還，他的說法前後矛盾。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '🧑‍💼', name: '阿哲', zh: '夜間保全實習生' },
        { emoji: '🧹', name: '慧姐', zh: '清潔阿姨' },
        { emoji: '👨‍🎨', name: '老修復師', zh: '文物修復師' },
        { emoji: '👩', name: '阿妍', zh: '導覽志工' },
      ],
      answer: 0,
      clueZh: '阿哲打卡時間和監視器矛盾、感應燈觸發地點戳破他的不在場證明、目擊者看到他蹲在展示櫃旁、泥印鞋印和鑰匙歸還時間都對不上——所有線索都指向阿哲。原來主管稍早提到要「淘汰展示櫃裡的舊道具」，阿哲誤以為胸針是要丟棄的仿製品，想拿回家給懂骨董的爺爺看看，沒想到那其實是真品古董！',
    },
  },

  // ===== Case 26: 銀鈴的迴響 =====
  {
    id: 'sp_silver_bell',
    title: '銀鈴的迴響',
    icon: '🔔',
    sceneZh: '學校紀念館裡，準備在今天頒獎典禮上頒發的「銀鈴獎」不見了，展示台上只留下一個外觀相似的仿製品。典禮再過幾小時就要開始，你能在頒獎前找回真正的銀鈴嗎？',
    adv: true,
    arcZh: '紀念館外的監視器意外拍到另一個畫面——就在真相水落石出前幾分鐘，有個黑影輕巧地一躍，跨過側翼屋頂兩公尺寬的落差，動作快得像貓一樣靈活，完全不像普通人辦得到。',
    rooms: [
      {
        type: 'liar',
        factZh: '學務處的鑰匙簽收表顯示，展示櫃的備用鑰匙昨晚八點已經被工友伯伯收進保管室鎖好，直到今天早上七點才重新取出。',
        statements: [
          { speaker: '👴 工友伯伯', textEn: "I locked the spare key in the storage room at eight o'clock last night as usual." },
          { speaker: '🧑 阿廷', textEn: 'I borrowed the spare key from the storage room at nine o\'clock to fix the display light.' },
          { speaker: '👩‍🏫 班導', textEn: 'I was grading papers in my office the whole evening.' },
        ],
        a: 1,
        explainZh: '簽收表顯示鑰匙八點就被鎖進保管室、直到隔天早上才取出，阿廷卻說自己九點借了鑰匙修燈，這跟紀錄矛盾，證明他說謊了。',
        clueZh: '阿廷聲稱九點借了備用鑰匙修燈，但簽收表顯示鑰匙那時早已鎖進保管室，他的說法完全對不上。',
      },
      {
        type: 'code',
        riddleEn: 'I am a shiny grey-white metal. Jewelry and bells are often made from me. I am more common than gold, but still valuable.',
        answer: 'SILVER',
        letterBank: ['S', 'I', 'L', 'V', 'E', 'R', 'G', 'O', 'T', 'N'],
        explainZh: '謎題描述「閃亮的灰白色金屬、常用來做珠寶和鈴鐺、比金子常見但依然珍貴」——答案是 silver（銀），正是這次失蹤的銀鈴材質！',
        clueZh: '展示台上留下一小片銀色金屬碎屑，材質和消失的銀鈴一模一樣。',
      },
      {
        type: 'read',
        textEn: "Cheng transferred to this school only two weeks ago. Yesterday evening, she stayed in the library to finish her homework because she did not know her way around the campus yet. The librarian remembers seeing her at the same table from six o'clock until the library closed at eight thirty. After that, Cheng's mother picked her up right at the school gate. She has never even been inside the memorial hall building.",
        question: 'Where was Cheng from six o\'clock until eight thirty?',
        options: ['In the library finishing her homework.', 'In the memorial hall.', 'On the school roof.'],
        a: 0,
        explainZh: '文章寫 the librarian remembers seeing her at the same table...until the library closed，可以排除她的嫌疑。',
        clueZh: '小澄從六點到八點半都在圖書館寫作業，館員可以作證，她甚至從沒去過紀念館，可以排除她的嫌疑。',
      },
      {
        type: 'witness',
        descEn: 'This person was seen standing very close to the display case around seven forty, holding a small screwdriver. He kept looking around nervously to check if anyone was watching.',
        options: [
          { emoji: '🧑', label: '阿廷' },
          { emoji: '👴', label: '工友伯伯' },
          { emoji: '👩‍🏫', label: '班導' },
          { emoji: '👧', label: '小澄' },
        ],
        a: 0,
        explainZh: '拿著螺絲起子、緊張張望、七點四十在展示櫃旁——都指向阿廷。',
        clueZh: '有人看到一個拿著螺絲起子、神情緊張、不斷張望的男生，七點四十分左右站在展示櫃旁邊。',
      },
      {
        type: 'alibi',
        factZh: '紀念館的感應門鈴紀錄顯示，昨晚七點半到八點之間，只有一張學生證曾經刷卡進出紀念館側門。',
        suspects: [
          { emoji: '🧑', name: '阿廷', alibiEn: "My student card never left my bag last night, so I couldn't have used it at the side door." },
          { emoji: '👩‍🏫', name: '班導', alibiEn: "I don't carry a student card, only a teacher's staff card." },
          { emoji: '👧', name: '小澄', alibiEn: 'I was in the library the whole time and never went to the memorial hall.' },
        ],
        a: 0,
        explainZh: '感應紀錄顯示七點半到八點之間有學生證刷卡進出側門，阿廷卻說自己的學生證整晚都在書包裡沒用過，這和感應紀錄矛盾。',
        clueZh: '阿廷聲稱學生證整晚沒離開書包，但感應門鈴紀錄顯示七點半到八點之間確實有他的學生證刷卡進出側門。',
      },
      {
        type: 'timeline',
        introZh: '請依照紀念館昨晚的真實時間順序，排出下列事件發生的先後。',
        events: [
          'The caretaker locked the spare key in the storage room at eight o\'clock.',
          'A student card swiped through the side door at seven forty-five.',
          'The librarian saw Cheng leave the library at eight thirty.',
          'The teacher finished grading papers and went home at nine o\'clock.',
        ],
        order: [1, 0, 2, 3],
        explainZh: '七點四十五分先有學生證刷卡進出側門，八點工友才把備用鑰匙鎖起來，八點半小澄離開圖書館，九點老師才回家——按時間排列就能看出破口出現在鎖鑰匙之前。',
        clueZh: '時間軸清楚顯示，側門刷卡的時間就在阿廷聲稱鑰匙已經鎖起來的說法之前，剛好戳破了他的謊言。',
      },
      {
        type: 'code',
        riddleEn: 'I am a special event. Schools hold me to honor top students. A silver bell might be given out during me.',
        answer: 'CEREMONY',
        letterBank: ['C', 'E', 'R', 'E', 'M', 'O', 'N', 'Y', 'T', 'S', 'A', 'L'],
        explainZh: '謎題描述「特別的活動、學校用來表揚優秀學生、頒獎典禮上可能會頒發銀鈴」——答案是 ceremony（典禮），正是今天原本要舉行銀鈴頒獎典禮的日子！',
        clueZh: '公佈欄上貼著今天典禮的流程表，安排銀鈴頒獎環節的時間，正好與失竊時間前後吻合。',
      },
      {
        type: 'read',
        textEn: "The caretaker has worked at this school for fifteen years. Every evening, he locks all the spare keys in the storage room at eight o'clock sharp, just like last night. After locking up, he always walks straight to the bus stop to catch the last bus home. Last night was no different, and the bus driver remembers seeing him get on the bus at eight fifteen.",
        question: 'What did the caretaker do right after locking the keys last night?',
        options: ['He walked to the bus stop and went home.', 'He went to check the display case.', 'He stayed to guard the memorial hall.'],
        a: 0,
        explainZh: '文章寫 he always walks straight to the bus stop，加上公車司機證實他八點十五分上車，可以排除他的嫌疑。',
        clueZh: '工友伯伯鎖好鑰匙後就直接走去搭公車回家，公車司機也證實看到他八點十五分上車，可以排除他的嫌疑。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '🧑', name: '阿廷', zh: '去年銀鈴獎第二名' },
        { emoji: '👴', name: '工友伯伯', zh: '負責保管鑰匙' },
        { emoji: '👩‍🏫', name: '班導', zh: '負責典禮流程' },
        { emoji: '👧', name: '小澄', zh: '剛轉來的插班生' },
      ],
      answer: 0,
      clueZh: '阿廷謊稱借鑰匙的時間、感應門鈴紀錄戳破他的不在場證明、目擊者看到他拿著螺絲起子在展示櫃旁徘徊、時間軸更清楚指出破口出現在他所謂「鎖鑰匙之前」。所有線索都指向阿廷——去年他就是銀鈴獎的第二名，今年怕自己又輸給對手，一時忌妒就把真的銀鈴換成仿製品，藏進了自己的書包！',
    },
  },

  // ===== Case 27: 屋頂上的影子 =====
  {
    id: 'sp_rooftop_shadow',
    title: '屋頂上的影子',
    icon: '🌃',
    sceneZh: '頂樓的天文社觀測站，準備好要用來看流星雨的望遠鏡竟然不見了。社長急得像熱鍋上的螞蟻，你能在流星雨開始前找回望遠鏡嗎？',
    adv: true,
    arcZh: '案子結束後，警衛在頂樓門邊撿到一張沒人認領的小卡片，上面用炭筆畫了一個小小的貓掌印，邊角還留著一道淺淺的爪痕——這已經不是第一次在深夜案發現場看到同樣的記號了，好像是某個身手矯捷的神秘身影，特意留下的招呼。',
    rooms: [
      {
        type: 'witness',
        descEn: 'This person is small and was seen near the rooftop door around nine o\'clock. She was carrying something long wrapped in a blanket. She kept looking up at the sky with excitement.',
        options: [
          { emoji: '🧑', label: '阿方' },
          { emoji: '👦', label: '小海' },
          { emoji: '👮', label: '警衛叔叔' },
          { emoji: '👧', label: '妹妹' },
        ],
        a: 3,
        explainZh: 'small、carrying something long wrapped in a blanket、excited about the sky——都指向妹妹。',
        clueZh: '有人看到一個嬌小的女生九點左右出現在頂樓門口，懷裡抱著用毯子包住的長條物品，一直興奮地抬頭看天空。',
      },
      {
        type: 'timeline',
        introZh: '請依照昨晚頂樓真實發生的順序，排出下列事件。',
        events: [
          'The club president set up the telescope at eight o\'clock.',
          'The guard checked the rooftop door and found it unlocked at nine fifteen.',
          'Someone was seen carrying a long wrapped object down the stairs at nine ten.',
          'The rival club member arrived to borrow star charts at eight thirty.',
        ],
        order: [0, 3, 2, 1],
        explainZh: '先是八點社長架設好望遠鏡，八點半對手社員來借星圖，九點十分有人抱著長條物下樓，九點十五分警衛才發現門沒鎖——排列起來就能看出望遠鏡消失的關鍵時刻。',
        clueZh: '時間軸顯示東西被抱下樓的時間，正好落在警衛發現門沒鎖之前，範圍縮小到當時還留在頂樓的人。',
      },
      {
        type: 'liar',
        factZh: '天文社的借用登記簿顯示，小海昨晚只借了星圖就在八點四十分離開了頂樓，並沒有再回來過。',
        statements: [
          { speaker: '👦 小海', textEn: 'I stayed on the rooftop until nine thirty to help set up the telescope.' },
          { speaker: '🧑 阿方', textEn: 'I was setting up the telescope from eight until the guard arrived.' },
          { speaker: '👮 警衛叔叔', textEn: "I checked the rooftop door at nine fifteen and found it unlocked." },
        ],
        a: 0,
        explainZh: '登記簿清楚記錄小海八點四十分就離開了，他卻說自己待到九點半幫忙架設望遠鏡，說法和紀錄矛盾，證明他說謊。',
        clueZh: '小海聲稱自己待到九點半幫忙架設，但登記簿顯示他八點四十分就已經離開頂樓，說法完全對不上。',
      },
      {
        type: 'alibi',
        factZh: '頂樓門的電子鎖記錄顯示，昨晚九點十分那一次開門，用的是社長家專屬的備用磁卡，而那張磁卡本週都放在妹妹的書包裡，因為社長前幾天請妹妹幫忙拿去給修鎖師傅估價。',
        suspects: [
          { emoji: '🧑', name: '阿方', alibiEn: 'I used my own keycard to set up the telescope, not the spare one.' },
          { emoji: '👦', name: '小海', alibiEn: "I don't own a keycard, so I always knock on the door." },
          { emoji: '👧', name: '妹妹', alibiEn: 'I stayed in my room doing homework all night and never went up to the roof.' },
        ],
        a: 2,
        explainZh: '電子鎖紀錄顯示九點十分開門用的正是妹妹書包裡的備用磁卡，她卻說自己整晚都在房間寫作業、沒上頂樓，這和門鎖紀錄矛盾，證明她的說法站不住腳。',
        clueZh: '妹妹聲稱整晚都待在房間寫作業，但電子鎖紀錄卻顯示，開門用的正是她書包裡那張備用磁卡，說法完全兜不攏。',
      },
      {
        type: 'read',
        textEn: "The rooftop guard has patrolled this building for eight years. Every night, he checks the rooftop door lock at exactly nine fifteen and writes the result in his notebook. Last night, he found the door unlocked and immediately called the club president. He waited by the door until the president arrived five minutes later. He never touched the telescope equipment at all.",
        question: 'What did the guard do after he found the door unlocked?',
        options: ['He called the club president right away.', 'He carried the telescope downstairs.', 'He locked the door and left.'],
        a: 0,
        explainZh: '文章寫 he found the door unlocked and immediately called the club president，可以排除他偷走望遠鏡的嫌疑。',
        clueZh: '警衛叔叔發現門沒鎖後立刻通知社長，一直等到社長到場，從頭到尾沒有碰過望遠鏡，可以排除他的嫌疑。',
      },
      {
        type: 'code',
        riddleEn: 'I am flat or curved glass. I reflect light and images. Big versions of me sit inside powerful telescopes.',
        answer: 'MIRROR',
        letterBank: ['M', 'I', 'R', 'R', 'O', 'R', 'T', 'S', 'A', 'N'],
        explainZh: '謎題描述「平的或彎曲的玻璃、能反射光線和影像、大片的我會裝在強力望遠鏡裡」——答案是 mirror（鏡子），望遠鏡裡最重要的零件！',
        clueZh: '望遠鏡原本放置的架子上，留下一小圈鏡片反光的痕跡，證明望遠鏡確實曾經架設在這裡。',
      },
      {
        type: 'alibi',
        factZh: '妹妹房間的書桌抽屜裡，後來被發現藏著一份寫著星座名稱的筆記，字跡潦草，倒像是連夜抄下來的。',
        suspects: [
          { emoji: '🧑', name: '阿方', alibiEn: 'I keep all my astronomy notes in the clubroom, never at home.' },
          { emoji: '👦', name: '小海', alibiEn: 'My notes are all typed on my computer, I never handwrite them.' },
          { emoji: '👧', name: '妹妹', alibiEn: 'I have never written down any constellation names in my life.' },
        ],
        a: 2,
        explainZh: '抽屜裡明明藏著一份手寫的星座筆記，妹妹卻說自己從沒寫過任何星座名稱，這和抽屜裡的物證矛盾，證明她在說謊。',
        clueZh: '妹妹堅稱自己從沒寫過星座筆記，但她書桌抽屜裡卻藏著一份連夜手抄的星座名稱清單，說法完全對不上。',
      },
      {
        type: 'witness',
        descEn: "A small, light fingerprint was found on the telescope's lens cap. A faint smudge shaped like a blurry paw print was also found on the dusty rooftop floor right beside it.",
        options: [
          { emoji: '🧑', label: '阿方' },
          { emoji: '👦', label: '小海' },
          { emoji: '👮', label: '警衛叔叔' },
          { emoji: '👧', label: '妹妹' },
        ],
        a: 3,
        explainZh: '小小的指紋加上鏡頭蓋上的痕跡，都指向妹妹；而旁邊那個模糊的貓掌形狀污漬，則是另一個更神秘的訪客留下的。',
        clueZh: '望遠鏡鏡頭蓋上採集到一枚小小的指紋，旁邊的地板上還留著一個模糊的貓掌形狀污漬——兩種痕跡似乎分屬不同的人。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '🧑', name: '阿方', zh: '天文社社長' },
        { emoji: '👦', name: '小海', zh: '對手社團成員' },
        { emoji: '👮', name: '警衛叔叔', zh: '大樓夜間警衛' },
        { emoji: '👧', name: '妹妹', zh: '社長的妹妹' },
      ],
      answer: 3,
      clueZh: '目擊者看到嬌小的女生抱著長條物下樓；電子鎖紀錄戳破妹妹謊稱整晚在房間的說法；書桌抽屜裡的手抄星座筆記更是鐵證；望遠鏡鏡頭蓋上的小指紋也對得上。所有線索都指向妹妹——她實在太想在流星雨來臨前，自己先偷偷試試看望遠鏡看星星是什麼感覺，才會忍不住抱回房間！',
    },
  }
);
