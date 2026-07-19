/* ===== English Detective Agency case data (英語偵探社) =====
   DETECTIVE_CASES: 8 escape-room-style reading-comprehension mysteries.
   Each case has 4 "rooms" (one of each puzzle type: read/liar/code/witness,
   order varies per case) and a final culprit line-up. Every room carries an
   extra `clueZh` fragment (beyond the schema's explainZh, which teaches the
   reading point on a wrong answer) — clueZh is what gets pinned to the
   線索板 (clue board) once the room is solved, and the case's culprit.clueZh
   is the closing summary shown once the correct suspect is accused.
   English is kept at Taiwan elementary level (short, familiar vocabulary).
*/

const DETECTIVE_CASES = [
  // ===== Case 1: 失蹤的便當 =====
  {
    id: 'lunchbox',
    title: '失蹤的便當',
    icon: '🍱',
    sceneZh: '阿明的便當在營養午餐時間消失了！便當盒裡裝著媽媽特別做的炒飯，現在卻只剩空空的桌子。四位同學都有可能經過現場，你能找出真正的偷便當賊嗎？',
    rooms: [
      {
        type: 'witness',
        descEn: 'This person is very tall. He wears a basketball jersey. He was hungry after practice.',
        options: [
          { emoji: '👦', label: '小杰' },
          { emoji: '👧', label: '小美' },
          { emoji: '🧑', label: '大衛' },
          { emoji: '👶', label: '弟弟' },
        ],
        a: 2,
        explainZh: '描述中的 very tall、basketball jersey、hungry after practice 都指向同一個人——籃球隊隊長大衛！閱讀時要把每個特徵在腦中拼成一張完整的圖片。',
        clueZh: '目擊者說看到一位穿著籃球球衣、又高又餓的男生在阿明的座位附近徘徊。',
      },
      {
        type: 'read',
        textEn: "Amy is the class leader. During lunch, she helped the teacher carry books to the office. She spent the whole lunch break there. She came back to the classroom after the bell rang.",
        question: 'What did Amy do during lunch?',
        options: ['She helped carry books to the office.', 'She ate lunch with David.', 'She played basketball.'],
        a: 0,
        explainZh: '文章清楚寫出 Amy spent the whole lunch break 在辦公室幫忙搬書，所以她整個午休時間都不在教室，可以排除她的嫌疑。',
        clueZh: '調查後發現小美整個午休都在辦公室幫老師搬書，完全不在案發現場。',
      },
      {
        type: 'liar',
        factZh: '籃球隊的練習每天中午 12 點才開始，練習需要 30 分鐘。',
        statements: [
          { speaker: '🧑 大衛', textEn: 'I finished basketball practice at 11:30 and went straight to the gym shower.' },
          { speaker: '👦 小杰', textEn: 'I was doing my homework in the classroom the whole lunch time.' },
          { speaker: '👶 弟弟', textEn: 'I ate lunch with my class downstairs.' },
        ],
        a: 0,
        explainZh: '已知練習中午 12 點才開始，大衛卻說自己 11:30 就「練習完畢」，時間對不上，所以他說謊了！',
        clueZh: '大衛謊稱練習提前結束，但事實上練習根本還沒開始，他的說法完全矛盾。',
      },
      {
        type: 'code',
        riddleEn: 'I am small and yellow. I come from a chicken. You often see me in fried rice.',
        answer: 'EGG',
        letterBank: ['E', 'G', 'G', 'A', 'T', 'S', 'O'],
        explainZh: '謎題描述「小小的、黃色的、來自雞、常出現在炒飯裡」——答案就是 egg（蛋）！這提醒我們便當裡遺留的蛋殼，就是重要證物。',
        clueZh: '在阿明的座位下發現了一小片蛋殼，這是那份消失便當唯一留下的證據。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '小杰', zh: '坐在阿明隔壁的同學' },
        { emoji: '👧', name: '小美', zh: '班上的班長' },
        { emoji: '🧑', name: '大衛', zh: '籃球隊隊長' },
        { emoji: '👶', name: '弟弟', zh: '阿明的弟弟，一年級' },
      ],
      answer: 2,
      clueZh: '目擊者看到高大、穿球衣、飢餓的男生（大衛）出現在現場；小美有明確的不在場證明；大衛卻謊稱練習提前結束——時間根本兜不攏；再加上座位下的蛋殼證物，種種線索都指向同一人：大衛就是偷吃便當的人！',
    },
  },

  // ===== Case 2: 圖書館幽靈 =====
  {
    id: 'library_ghost',
    title: '圖書館幽靈',
    icon: '👻',
    sceneZh: '放學後，圖書館裡的書本會自動掉下來，還有奇怪的腳步聲！同學們都說那是幽靈。身為偵探的你決定留下來查清楚真相。',
    rooms: [
      {
        type: 'read',
        textEn: "Every day after school, Mr. Lin locks the library door at five o'clock. Yesterday, he left early because he had a doctor's appointment. He asked Hong to lock the door for him. Hong forgot to lock it.",
        question: "Why didn't Mr. Lin lock the door himself yesterday?",
        options: ["He had a doctor's appointment.", 'He was reading a book.', 'He went home early to sleep.'],
        a: 0,
        explainZh: "文章提到 he left early because he had a doctor's appointment，because 後面就是原因，這是判斷因果關係的重要技巧。",
        clueZh: '調查發現昨天林老師提早離開去看醫生，還請阿宏幫忙鎖門——但門後來沒鎖。',
      },
      {
        type: 'liar',
        factZh: '阿宏的籃球隊練習每天放學後在圖書館隔壁的體育館進行，一直練到晚上七點。',
        statements: [
          { speaker: '👧 小雨', textEn: 'I locked the library windows before I left.' },
          { speaker: '🧑‍🦰 阿宏', textEn: 'I went straight home after school and never came back.' },
          { speaker: '👨‍🏫 林老師', textEn: 'I asked Hong to lock the door for me.' },
        ],
        a: 1,
        explainZh: '已知阿宏的球隊每天放學後都在圖書館隔壁練球到七點，他卻說「放學後直接回家、沒有再回來」，這和事實矛盾，代表他說謊了。',
        clueZh: '阿宏聲稱放學後直接回家，但他的籃球隊其實每天都在圖書館隔壁練球到很晚，他的話根本站不住腳。',
      },
      {
        type: 'witness',
        descEn: 'This person has messy orange hair. He wears a basketball jersey. He likes to play tricks on his classmates.',
        options: [
          { emoji: '👧', label: '小雨' },
          { emoji: '🧑‍🦰', label: '阿宏' },
          { emoji: '🐱', label: '貓咪' },
          { emoji: '👨‍🏫', label: '林老師' },
        ],
        a: 1,
        explainZh: 'messy orange hair、basketball jersey、likes to play tricks 這些形容詞跟名詞的組合，正好描述出阿宏的外型與個性。',
        clueZh: '有人看到一個橘色亂髮、穿著球衣、很愛惡作劇的男生，在圖書館關燈後偷偷溜進去。',
      },
      {
        type: 'code',
        riddleEn: 'I am thin and made of paper. Readers use me to mark their place in a book.',
        answer: 'BOOKMARK',
        letterBank: ['B', 'O', 'O', 'K', 'M', 'A', 'R', 'K', 'T', 'S', 'E', 'L'],
        explainZh: '謎題描述「薄薄的紙、幫讀者標記書本位置」——答案是 bookmark（書籤）！掉滿地的書籤，正是幽靈搗亂留下的痕跡。',
        clueZh: '地上散落著好幾張書籤，全部都是從高處被人推落的書本裡掉出來的。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👧', name: '小雨', zh: '圖書股長' },
        { emoji: '🧑‍🦰', name: '阿宏', zh: '愛惡作劇的男生' },
        { emoji: '🐱', name: '圖書館貓咪', zh: '常常在書架間走動的貓' },
        { emoji: '👨‍🏫', name: '林老師', zh: '圖書館管理員' },
      ],
      answer: 1,
      clueZh: '林老師提早離開時請阿宏鎖門，阿宏卻沒做到；他還謊稱放學後直接回家，但球隊練習明明就在圖書館隔壁到很晚；目擊者又看到一個橘髮、愛惡作劇的男生溜進圖書館；地上散落的書籤更證明有人在推書搗亂。所有線索都指向阿宏——原來「幽靈」就是他惡作劇！',
    },
  },

  // ===== Case 3: 校園塗鴉客 =====
  {
    id: 'graffiti',
    title: '校園塗鴉客',
    icon: '🎨',
    sceneZh: '學校的白牆一夜之間出現了奇怪的彩色塗鴉！校長很生氣，要求同學們找出兇手。到底是誰趁著晚上偷偷畫上去的呢？',
    rooms: [
      {
        type: 'liar',
        factZh: '美術教室的顏料櫃每天放學後五點就會被陳老師鎖起來。',
        statements: [
          { speaker: '👧 小蓁', textEn: "I borrowed paint from the art room at six o'clock yesterday." },
          { speaker: '👦 阿吉', textEn: 'I was at home doing my English homework last night.' },
          { speaker: '🧑‍🎨 陳老師', textEn: "I locked the paint cabinet at five o'clock as always." },
        ],
        a: 0,
        explainZh: '陳老師五點就把顏料櫃鎖起來了，小蓁卻說自己六點去借顏料，這在時間上根本不可能發生，代表她說謊了。',
        clueZh: '小蓁說她六點去美術教室借顏料，但顏料櫃五點就已經鎖上了，她的說法有很大的漏洞。',
      },
      {
        type: 'code',
        riddleEn: 'I come in many colors. Artists press me on paper or walls to make pictures. I am wet, not dry.',
        answer: 'PAINT',
        letterBank: ['P', 'A', 'I', 'N', 'T', 'R', 'S', 'O', 'E'],
        explainZh: '謎題描述「很多顏色、藝術家用來畫圖、濕濕的」——答案是 paint（顏料），牆上五彩的塗鴉正是用顏料畫成的。',
        clueZh: '牆角留下了一罐打翻的顏料，顏色和牆上塗鴉的顏色完全相同。',
      },
      {
        type: 'read',
        textEn: "Chen is the art teacher. Every evening, she stays in the art room until five o'clock to clean the brushes. Then she goes home and does not come back to school at night.",
        question: "What does Chen do every evening before five o'clock?",
        options: ['She cleans the brushes.', 'She paints on the wall.', 'She plays basketball.'],
        a: 0,
        explainZh: '文章說 she stays...to clean the brushes，直接說明陳老師傍晚的例行工作是清洗畫筆，而不是在晚上回學校畫牆，可以排除她的嫌疑。',
        clueZh: '陳老師每天傍晚都在教室洗畫筆，晚上不會再回學校，可以排除她的嫌疑。',
      },
      {
        type: 'witness',
        descEn: 'This person has paint on her fingers. She carries a sketchbook everywhere. She loves drawing colorful pictures.',
        options: [
          { emoji: '👧', label: '小蓁' },
          { emoji: '👦', label: '阿吉' },
          { emoji: '🧑‍🎨', label: '陳老師' },
          { emoji: '👴', label: '校工爺爺' },
        ],
        a: 0,
        explainZh: 'paint on her fingers、carries a sketchbook、loves drawing colorful pictures 都是形容一個熱愛畫畫的人，正好符合小蓁的形象。',
        clueZh: '有人看到一個手指沾滿顏料、隨身帶著素描本的女生，在晚上經過那面白牆。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👧', name: '小蓁', zh: '美術班學生' },
        { emoji: '👦', name: '阿吉', zh: '愛畫畫的轉學生' },
        { emoji: '🧑‍🎨', name: '陳老師', zh: '美術老師' },
        { emoji: '👴', name: '校工爺爺', zh: '負責打掃校園' },
      ],
      answer: 0,
      clueZh: '小蓁聲稱六點去借顏料，但顏料櫃五點就鎖了，說法矛盾；牆角的顏料罐顏色和塗鴉一致；陳老師傍晚都在洗畫筆，不可能是她；目擊者看到手指沾滿顏料、帶著素描本的女生出現在牆邊。這些線索都指向小蓁——原來她是想給學校一個驚喜壁畫，卻忘了先取得同意！',
    },
  },

  // ===== Case 4: 消失的獎盃 =====
  {
    id: 'trophy',
    title: '消失的獎盃',
    icon: '🏆',
    sceneZh: '學校獎盃陳列櫃裡最閃亮的「全國英語演講冠軍獎盃」不見了！這座獎盃對學校來說非常重要，老師請你幫忙找回它。',
    rooms: [
      {
        type: 'code',
        riddleEn: 'I am shiny and gold. Winners hold me up high. I sit on a shelf in the school office.',
        answer: 'TROPHY',
        letterBank: ['T', 'R', 'O', 'P', 'H', 'Y', 'S', 'E', 'A', 'N'],
        explainZh: '謎題描述「閃亮的、金色的、得獎者會高舉我」——答案是 trophy（獎盃），正是這次失蹤的物品！',
        clueZh: '獎盃陳列櫃的玻璃上留下了一個模糊的指紋，旁邊還有一張寫著 TROPHY 的小紙條。',
      },
      {
        type: 'witness',
        descEn: "This person has short black hair. He wears his school jacket every day. He looks upset when he talks about last year's speech contest.",
        options: [
          { emoji: '👦', label: '小豪' },
          { emoji: '👧', label: '雅婷' },
          { emoji: '🧑‍💼', label: '警衛叔叔' },
          { emoji: '👩‍🏫', label: '教務主任' },
        ],
        a: 0,
        explainZh: "short black hair、wears his school jacket、upset about the speech contest 這些線索都指向對演講比賽結果耿耿於懷的小豪。",
        clueZh: '目擊者說看到一個穿著外套、提到去年演講比賽就很不開心的男生，在獎盃室外徘徊。',
      },
      {
        type: 'liar',
        factZh: '獎盃室的鑰匙只有教務主任和警衛叔叔兩個人有，學生沒有鑰匙。',
        statements: [
          { speaker: '👦 小豪', textEn: 'I used my own key to open the trophy room last night.' },
          { speaker: '👧 雅婷', textEn: "I was in the student council meeting until six o'clock." },
          { speaker: '🧑‍💼 警衛叔叔', textEn: "I locked the trophy room at five o'clock as usual." },
        ],
        a: 0,
        explainZh: '已知只有主任和警衛有鑰匙，學生沒有鑰匙，小豪卻說自己「用自己的鑰匙」打開獎盃室，這句話明顯不合理，他說謊了。',
        clueZh: '小豪聲稱自己有獎盃室的鑰匙，但事實上鑰匙只有主任和警衛才有，他的話漏洞百出。',
      },
      {
        type: 'read',
        textEn: "Yating is the student council president. Yesterday evening, she had a long meeting with other student leaders. The meeting started at four thirty and ended at six o'clock. After the meeting, she went straight home.",
        question: "When did Yating's meeting end?",
        options: ["At six o'clock.", 'At four thirty.', "At five o'clock."],
        a: 0,
        explainZh: "文章明確寫出 the meeting...ended at six o'clock，只要找到關鍵字 ended 就能正確回答問題，這是找出特定資訊的重要閱讀技巧。",
        clueZh: '雅婷整個傍晚都在開學生會會議，一直到六點才結束，時間上完全對不上，可以排除她的嫌疑。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '小豪', zh: '去年演講比賽亞軍' },
        { emoji: '👧', name: '雅婷', zh: '學生會會長' },
        { emoji: '🧑‍💼', name: '警衛叔叔', zh: '負責巡邏的警衛' },
        { emoji: '👩‍🏫', name: '教務主任', zh: '負責管理獎盃室' },
      ],
      answer: 0,
      clueZh: '獎盃櫃上的指紋和紙條、目擊者看到耿耿於懷的男生徘徊在獎盃室外、小豪謊稱自己有鑰匙但學生根本不可能有鑰匙、雅婷有開會的不在場證明——所有線索都指向小豪，他因為忌妒去年輸掉比賽，偷偷拿走了獎盃！',
    },
  },

  // ===== Case 5: 夜市扒手 =====
  {
    id: 'market',
    title: '夜市扒手',
    icon: '🎡',
    sceneZh: '熱鬧的夜市裡，王奶奶的錢包被扒手偷走了！小吃攤前人來人往，你能從線索中找出那個扒手嗎？',
    rooms: [
      {
        type: 'witness',
        descEn: 'This person wears a black hoodie. He has a scar on his left hand. He was standing very close to the fruit stand.',
        options: [
          { emoji: '🧑‍🦱', label: '阿強' },
          { emoji: '👦', label: '小凱' },
          { emoji: '👵', label: '水果攤阿姨' },
          { emoji: '👮', label: '巡邏警察' },
        ],
        a: 1,
        explainZh: 'black hoodie、scar on his left hand、standing close to the fruit stand 這些細節組合起來，正是描述小凱的外型與位置。',
        clueZh: '有人看到一個穿黑色連帽外套、左手有疤痕的少年，一直站在水果攤附近。',
      },
      {
        type: 'liar',
        factZh: '巡邏警察每天晚上七點到九點都會在夜市入口站崗，不會離開崗位。',
        statements: [
          { speaker: '👮 警察', textEn: 'I stood at the market entrance from seven to nine last night.' },
          { speaker: '🧑‍🦱 阿強', textEn: 'I was frying chicken at my stand the whole evening.' },
          { speaker: '👦 小凱', textEn: 'I left the market at six thirty and went home.' },
        ],
        a: 2,
        explainZh: '目擊者明明看到小凱七點多還站在水果攤附近，他卻說自己六點半就離開夜市回家了，前後說法矛盾，證明他說謊。',
        clueZh: '小凱說他六點半就回家了，但目擊者明明在七點多還看到他在夜市裡，他的說法前後矛盾。',
      },
      {
        type: 'read',
        textEn: "Uncle Qiang runs a fried chicken stand. Every evening, he is very busy frying chicken for customers. He never leaves his stand until closing time at ten o'clock.",
        question: 'When does Uncle Qiang leave his stand?',
        options: ["At ten o'clock, closing time.", 'At seven o\'clock.', 'He never works in the evening.'],
        a: 0,
        explainZh: "文章寫出 he never leaves his stand until closing time at ten o'clock，until 表示「直到...為止」，說明他一直忙到十點才會離開，可以排除他的嫌疑。",
        clueZh: '阿強整晚都忙著炸雞排，一直到十點打烊才離開攤位，可以排除他的嫌疑。',
      },
      {
        type: 'code',
        riddleEn: 'I am made of leather or cloth. I hold your money and cards. People carry me in a bag or pocket.',
        answer: 'WALLET',
        letterBank: ['W', 'A', 'L', 'L', 'E', 'T', 'S', 'O', 'R', 'N'],
        explainZh: '謎題描述「皮革或布做的、裝錢和卡片、放在包包或口袋裡」——答案是 wallet（錢包），就是王奶奶被偷走的東西！',
        clueZh: '水果攤旁的垃圾桶裡，發現了一個被丟棄的空錢包，正是王奶奶遺失的那一個。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '🧑‍🦱', name: '阿強', zh: '賣雞排的老闆' },
        { emoji: '👦', name: '小凱', zh: '常在夜市閒晃的少年' },
        { emoji: '👵', name: '水果攤阿姨', zh: '賣水果的阿姨' },
        { emoji: '👮', name: '巡邏警察', zh: '夜市巡邏員警' },
      ],
      answer: 1,
      clueZh: '目擊者看到黑色連帽、左手有疤痕的少年一直待在水果攤附近；小凱卻謊稱六點半就回家，和目擊時間矛盾；阿強整晚都在忙著炸雞排，不可能是他；水果攤旁垃圾桶找到的空錢包更是鐵證。所有線索都指向小凱——他就是那個扒手！',
    },
  },

  // ===== Case 6: 博物館假畫 =====
  {
    id: 'museum',
    title: '博物館假畫',
    icon: '🖼️',
    sceneZh: '市立美術館展出的鎮館之寶《向日葵花園》被人掉包成了一幅假畫！館長急得像熱鍋上的螞蟻，委託你這位小偵探來查明真相。',
    rooms: [
      {
        type: 'read',
        textEn: "The curator arrives at the museum every morning at eight o'clock. Last night, he stayed at home with his family and watched a movie. He did not visit the museum after it closed.",
        question: 'What did the curator do last night?',
        options: ['He stayed home and watched a movie.', 'He visited the museum.', 'He painted a new picture.'],
        a: 0,
        explainZh: '文章直接說明 he stayed at home...and watched a movie，並且 did not visit the museum，清楚表示他昨晚不在博物館，可以排除他的嫌疑。',
        clueZh: '策展人昨晚整晚都待在家裡看電影，並沒有去過博物館，可以排除他的嫌疑。',
      },
      {
        type: 'witness',
        descEn: 'This person wears an expensive suit and a gold watch. He often talks about buying famous paintings. He visited the gallery late at night.',
        options: [
          { emoji: '🧑‍🎨', label: '畫家本人' },
          { emoji: '👨‍💼', label: '策展人' },
          { emoji: '👩‍🦳', label: '清潔阿姨' },
          { emoji: '🕵️', label: '私人收藏家' },
        ],
        a: 3,
        explainZh: 'expensive suit、gold watch、buying famous paintings 這些描述，正好指向那位喜歡收藏名畫的私人收藏家。',
        clueZh: '有人看到一位穿著昂貴西裝、戴著金錶的男子，深夜還在美術館附近徘徊。',
      },
      {
        type: 'code',
        riddleEn: 'I am a plant. I am usually yellow or colorful. I grow in a garden and I need sunlight.',
        answer: 'FLOWER',
        letterBank: ['F', 'L', 'O', 'W', 'E', 'R', 'T', 'S', 'A', 'N'],
        explainZh: '謎題描述「植物、通常是黃色或彩色、長在花園裡、需要陽光」——答案是 flower（花），正是那幅名畫《向日葵花園》的主題。',
        clueZh: '假畫的畫框背後，發現了一小張寫著 FLOWER 的便條紙，似乎是掉包者留下的記號。',
      },
      {
        type: 'liar',
        factZh: '美術館的保全系統會記錄下每一位深夜進出的訪客，清潔阿姨的班表是晚上八點到十點。',
        statements: [
          { speaker: '👩‍🦳 清潔阿姨', textEn: 'I cleaned the gallery from eight to ten and saw nothing strange.' },
          { speaker: '🕵️ 收藏家', textEn: 'I never entered the museum after it closed.' },
          { speaker: '🧑‍🎨 畫家', textEn: 'I was giving a painting class across town all evening.' },
        ],
        a: 1,
        explainZh: '保全系統記錄到深夜有訪客進出，而收藏家卻說自己「從未在閉館後進入博物館」，這和監視紀錄矛盾，證明他說謊了。',
        clueZh: '收藏家堅稱自己閉館後從未進入博物館，但保全系統的紀錄卻顯示深夜有人進出，他的說法完全站不住腳。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '🧑‍🎨', name: '畫家本人', zh: '原畫的作者' },
        { emoji: '👨‍💼', name: '策展人', zh: '負責布展的策展人' },
        { emoji: '👩‍🦳', name: '清潔阿姨', zh: '夜間清潔人員' },
        { emoji: '🕵️', name: '私人收藏家', zh: '喜歡收藏名畫的富商' },
      ],
      answer: 3,
      clueZh: '策展人整晚在家看電影，不可能是他；目擊者看到穿著昂貴西裝、戴金錶、深夜徘徊的男子；假畫框背後留下的 FLOWER 字條；再加上保全紀錄戳破了收藏家「從未深夜進入」的謊言——所有線索都指向那位私人收藏家，他為了得到心愛的名畫，偷偷掉包了真跡！',
    },
  },

  // ===== Case 7: 生日蛋糕竊案 =====
  {
    id: 'cake',
    title: '生日蛋糕竊案',
    icon: '🎂',
    sceneZh: '班上準備要給老師慶生的巧克力蛋糕，竟然在派對開始前被吃掉了一大塊！到底是誰忍不住偷吃了蛋糕呢？',
    rooms: [
      {
        type: 'liar',
        factZh: '蛋糕店老闆送蛋糕來學校後，就直接開車回店裡準備下一份訂單，不會留在學校。',
        statements: [
          { speaker: '👨‍🍳 老闆', textEn: 'I stayed at school for one more hour after the delivery.' },
          { speaker: '👧 欣欣', textEn: 'I decorated the cake and then went to wash my hands.' },
          { speaker: '👦 小胖', textEn: "I didn't go near the cake table at all today." },
        ],
        a: 0,
        explainZh: '已知蛋糕店老闆送完蛋糕就會直接開車回店裡，他卻說自己「多留了一小時」，和事實不符，證明他說謊了。',
        clueZh: '老闆聲稱送完蛋糕後多留了一小時，但他其實送完就得立刻開車回店裡準備下一份訂單，說法矛盾。',
      },
      {
        type: 'read',
        textEn: 'Xinxin decorated the cake with strawberries and chocolate chips. After that, her hands were very sticky. She went to the bathroom to wash her hands. She came back five minutes later.',
        question: 'Why did Xinxin go to the bathroom?',
        options: ['Her hands were sticky from decorating the cake.', 'She wanted to eat the cake.', 'She was hiding from the teacher.'],
        a: 0,
        explainZh: '文章寫 her hands were very sticky...She went to the bathroom to wash her hands，原因和結果緊密相連，這是判斷因果關係的閱讀技巧。',
        clueZh: '欣欣裝飾完蛋糕後，只是去洗掉手上黏黏的鮮奶油，很快就回來了，可以排除她的嫌疑。',
      },
      {
        type: 'code',
        riddleEn: 'I am white or brown. I taste very sweet. Bakers put a lot of me into cakes and cookies.',
        answer: 'SUGAR',
        letterBank: ['S', 'U', 'G', 'A', 'R', 'T', 'O', 'N', 'E'],
        explainZh: '謎題描述「白色或棕色、很甜、烘焙師會放很多在蛋糕和餅乾裡」——答案是 sugar（糖），蛋糕上沾滿糖霜的手印正是重要線索！',
        clueZh: '蛋糕旁邊的桌面上，留下了一些沾著糖霜的手印，手印的大小和小胖的手正好吻合。',
      },
      {
        type: 'witness',
        descEn: 'This person has chocolate on his fingers. He is a little chubby. He always asks for a second slice of cake at parties.',
        options: [
          { emoji: '👦', label: '小胖' },
          { emoji: '👧', label: '欣欣' },
          { emoji: '🐶', label: '班犬多多' },
          { emoji: '👨‍🍳', label: '蛋糕店老闆' },
        ],
        a: 0,
        explainZh: 'chocolate on his fingers、a little chubby、always asks for a second slice 這些特徵組合起來，正是描述最愛吃甜食的小胖。',
        clueZh: '有人看到一個手指沾著巧克力、身材圓圓的男生，在派對開始前偷偷靠近蛋糕桌。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '小胖', zh: '班上最愛吃甜食的男生' },
        { emoji: '👧', name: '欣欣', zh: '負責裝飾蛋糕的女生' },
        { emoji: '🐶', name: '班犬多多', zh: '教室裡養的小狗' },
        { emoji: '👨‍🍳', name: '蛋糕店老闆', zh: '訂做蛋糕的麵包店老闆' },
      ],
      answer: 0,
      clueZh: '老闆的說法和送貨後直接回店裡的事實矛盾；欣欣只是去洗手，很快就回來，不是她；桌上沾著糖霜的手印和小胖的手吻合；目擊者又看到手指沾巧克力、圓圓的男生偷偷靠近蛋糕桌。所有線索都指向小胖——他就是忍不住偷吃蛋糕的人！',
    },
  },

  // ===== Case 8: 最終大魔王快遞疑雲 =====
  {
    id: 'finale',
    title: '最終大魔王快遞疑雲',
    icon: '📦',
    sceneZh: '傳說中最狡猾的「快遞大盜」出現了！他專門調換珍貴的包裹，已經讓好幾間商店損失慘重。這是偵探社成立以來最大的挑戰，你準備好正面對決了嗎？',
    rooms: [
      {
        type: 'code',
        riddleEn: 'I am made of cardboard. I carry things inside me. A delivery person brings me to your door.',
        answer: 'PACKAGE',
        letterBank: ['P', 'A', 'C', 'K', 'A', 'G', 'E', 'T', 'S', 'O', 'N'],
        explainZh: '謎題描述「用紙板做的、裡面裝東西、快遞員會送到你家門口」——答案是 package（包裹），正是這次被調換的關鍵物品！',
        clueZh: '案發現場留下了一個空的包裝盒，上面用奇怪的字跡寫著 PACKAGE 幾個字，像是留給我們的暗號。',
      },
      {
        type: 'liar',
        factZh: '新來的快遞員上個月才剛加入公司，系統紀錄顯示他從來沒有送貨到過博物館那一區。',
        statements: [
          { speaker: '🕴️ 神秘快遞員', textEn: 'I have delivered packages to the museum area many times before.' },
          { speaker: '🧑‍💻 經理', textEn: 'I checked all delivery routes yesterday morning.' },
          { speaker: '👩‍🔧 倉庫阿姨', textEn: 'I counted all the packages before they left the warehouse.' },
        ],
        a: 0,
        explainZh: '系統紀錄清楚顯示這位新快遞員從沒送過博物館那一區，他卻說自己「送過很多次」，前後矛盾，證明他在說謊。',
        clueZh: '神秘快遞員聲稱自己常常送貨到博物館那一區，但系統紀錄顯示他根本從沒去過那裡，說法完全矛盾。',
      },
      {
        type: 'witness',
        descEn: "This person wears dark sunglasses even at night. He always keeps his delivery van's back doors locked with an extra lock. He never talks to his coworkers.",
        options: [
          { emoji: '🧑‍💻', label: '快遞公司經理' },
          { emoji: '🕴️', label: '神秘快遞員' },
          { emoji: '👩‍🔧', label: '倉庫管理員' },
          { emoji: '👴', label: '退休警探' },
        ],
        a: 1,
        explainZh: 'dark sunglasses even at night、an extra lock on the van、never talks to his coworkers 這些不尋常的細節，正好描述那位行蹤神秘的新快遞員。',
        clueZh: '有人看到一個晚上也戴著墨鏡、貨車後門多加一道鎖的快遞員，行為十分可疑。',
      },
      {
        type: 'read',
        textEn: 'The warehouse manager checks every package before it leaves the building. She writes down the number of each box in her notebook. Last week, all the numbers matched perfectly. She has never made a mistake in five years.',
        question: 'What does the warehouse manager do before packages leave?',
        options: ['She writes down the number of each box.', 'She opens every package to check inside.', 'She delivers the packages herself.'],
        a: 0,
        explainZh: '文章說明 She writes down the number of each box in her notebook，清楚描述她的固定工作內容，加上「五年來從未出錯」，可以排除她的嫌疑。',
        clueZh: '倉庫阿姨每次都仔細記錄每個包裹的編號，五年來從未出錯，可以排除她的嫌疑。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '🧑‍💻', name: '快遞公司經理', zh: '負責調度包裹的經理' },
        { emoji: '🕴️', name: '神秘快遞員', zh: '最近才加入的新快遞員' },
        { emoji: '👩‍🔧', name: '倉庫管理員', zh: '負責管理倉庫的阿姨' },
        { emoji: '👴', name: '退休警探', zh: '住在附近的退休警探' },
      ],
      answer: 1,
      clueZh: '案發現場留下寫著 PACKAGE 的空盒暗號；系統紀錄戳破了神秘快遞員「常送貨到博物館」的謊言；目擊者又看到一個深夜戴墨鏡、貨車多上一道鎖的可疑快遞員；倉庫阿姨的紀錄向來精準，不可能是她。所有線索都指向這位神秘快遞員——他就是傳說中的「快遞大盜」！英語偵探社，案件終於全部偵破！',
    },
  },
];
