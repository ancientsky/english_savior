/* ===== 偵探社擴充包 #2 (英語偵探社) =====
   16 new cases (9-24) pushed after js/data/detective.js's 8 base cases.
   Cases 9-16 step up to "medium" difficulty (slightly longer passages);
   cases 17-24 step up to "hard" (4-5 sentence passages, trickier liar
   logic with time/place contradictions, 5-7 letter code answers). See
   detective.js's header comment for the full room schema. Case 24 is the
   season-2 finale and ties back into the Detective Agency itself.
*/

DETECTIVE_CASES.push(
  // ===== Case 9: 校慶接力棒失蹤 =====
  {
    id: 'sports_day',
    title: '校慶接力棒失蹤',
    icon: '🏃',
    sceneZh: '校慶運動會大隊接力比賽即將開始，但代表班上出賽的接力棒卻不見了！沒有接力棒，全班就要棄權。你能在比賽開始前找出到底是誰把接力棒藏起來了嗎？',
    rooms: [
      {
        type: 'read',
        textEn: 'Wen is a member of the relay team. Before the race, she felt a pain in her stomach. She went to see the school nurse at eleven o\'clock. The nurse told her to rest on the bed for twenty minutes. She returned to the field at eleven twenty, right before the race started.',
        question: 'Why did Wen go to see the school nurse?',
        options: ['She had a stomachache.', 'She wanted to hide the baton.', 'She was tired from running.'],
        a: 0,
        explainZh: '文章寫 she felt a pain in her stomach 是原因，之後 went to see the school nurse 是結果，找出因果關係就能正確作答。',
        clueZh: '小雯賽前因為肚子痛去保健室，一直休息到 11:20 才回到操場，可以排除她的嫌疑。',
      },
      {
        type: 'witness',
        descEn: 'This person wears blue running shoes. He was standing near the equipment room before the race. He looked very nervous and kept biting his nails.',
        options: [
          { emoji: '👦', label: '阿翔' },
          { emoji: '👧', label: '小雯' },
          { emoji: '🧑‍🏫', label: '體育老師' },
          { emoji: '👦', label: '阿柏' },
        ],
        a: 3,
        explainZh: 'blue running shoes、near the equipment room、nervous biting his nails 這些細節組合起來，正好描述緊張的阿柏。',
        clueZh: '有人看到一個穿藍色跑鞋、在器材室附近徘徊、緊張咬指甲的男生。',
      },
      {
        type: 'liar',
        factZh: '體育器材室的鑰匙只有體育老師才有，而且他從早上七點就一直待在操場架設終點線，沒有離開過。',
        statements: [
          { speaker: '🧑‍🏫 體育老師', textEn: 'I stayed at the finish line setting up equipment all morning.' },
          { speaker: '👦 阿翔', textEn: 'I was warming up with my own class team the whole time.' },
          { speaker: '👦 阿柏', textEn: "I opened the equipment room with the teacher's key to get some water." },
        ],
        a: 2,
        explainZh: '已知鑰匙只有體育老師才有，阿柏卻說自己用老師的鑰匙打開器材室，這和事實矛盾，代表他說謊了。',
        clueZh: '阿柏聲稱自己用老師的鑰匙打開器材室拿水喝，但鑰匙其實只有體育老師才有，他的話漏洞百出。',
      },
      {
        type: 'code',
        riddleEn: 'I am long and thin like a stick. Runners pass me from hand to hand in a relay race.',
        answer: 'BATON',
        letterBank: ['B', 'A', 'T', 'O', 'N', 'S', 'E', 'R', 'L'],
        explainZh: '謎題描述「長長細細像一根棍子、接力賽跑者會互相傳遞」——答案是 baton（接力棒），正是這次失蹤的物品！',
        clueZh: '器材室角落找到了一根藏起來的接力棒，上面還沾著阿柏鞋子的泥土痕跡。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿翔', zh: '對手班的同學' },
        { emoji: '👧', name: '小雯', zh: '班上的接力隊員' },
        { emoji: '🧑‍🏫', name: '體育老師', zh: '負責保管器材' },
        { emoji: '👦', name: '阿柏', zh: '第一次上場的隊員' },
      ],
      answer: 3,
      clueZh: '小雯賽前一直在保健室休息，有明確不在場證明；目擊者看到緊張咬指甲、在器材室徘徊的阿柏；他又謊稱用老師鑰匙開器材室，但鑰匙只有老師有；器材室角落找到的接力棒還沾著他鞋子的泥土。所有線索都指向阿柏——他太緊張，怕自己拖累全班，所以偷偷把接力棒藏起來，想讓比賽延後！',
    },
  },

  // ===== Case 10: 夜市絨毛熊事件 =====
  {
    id: 'night_market',
    title: '夜市絨毛熊事件',
    icon: '🏮',
    sceneZh: '夜市裡新開幕的套圈圈攤位，最大獎的絨毛熊寶寶不見了！老闆氣得直跺腳，你能找出到底是誰拿走那隻絨毛熊的嗎？',
    rooms: [
      {
        type: 'liar',
        factZh: '監視器畫面顯示，老闆晚上八點去上廁所的五分鐘內，絨毛熊消失了，而且畫面中只拍到一位小男孩站在套圈圈攤位前。',
        statements: [
          { speaker: '👧 小雅', textEn: 'I was folding new prize toys at the back of the stand at eight o\'clock.' },
          { speaker: '👩 媽媽', textEn: 'I was looking at my phone the whole time and did not see anything.' },
          { speaker: '👦 小恩', textEn: 'I went home at seven o\'clock and never came back to the market.' },
        ],
        a: 2,
        explainZh: '監視器清楚拍到八點時有個小男孩站在攤位前，小恩卻說七點就回家了，說法與監視畫面矛盾，證明他在說謊。',
        clueZh: '小恩聲稱七點就回家了，但監視器畫面顯示八點時有個小男孩站在攤位前，他的說法完全對不上。',
      },
      {
        type: 'code',
        riddleEn: 'I am soft and furry. Children love to hug me. I have two eyes but I am not real.',
        answer: 'BEAR',
        letterBank: ['B', 'E', 'A', 'R', 'S', 'T', 'O', 'N'],
        explainZh: '謎題描述「軟軟毛茸茸的、小孩喜歡抱、有兩隻眼睛但不是真的」——答案是 bear（熊），正是那隻消失的絨毛熊寶寶。',
        clueZh: '套圈圈攤位下面找到一根絨毛熊掉落的細毛，還有一個孩童尺寸的小腳印。',
      },
      {
        type: 'witness',
        descEn: 'This person is small and wears a yellow cap. He was standing alone in front of the ring-toss stand at eight o\'clock. He was holding something soft and brown.',
        options: [
          { emoji: '👧', label: '小雅' },
          { emoji: '🧑', label: '阿伯' },
          { emoji: '👩', label: '媽媽' },
          { emoji: '👦', label: '小恩' },
        ],
        a: 3,
        explainZh: 'small、yellow cap、alone in front of the stand、holding something soft and brown，這些細節正好描述想要那隻熊的小恩。',
        clueZh: '目擊者說看到一個戴著黃色帽子、獨自站在套圈圈攤位前的小男孩，懷裡還抱著軟軟棕色的東西。',
      },
      {
        type: 'read',
        textEn: 'Aunt Ya is the owner\'s daughter. Every evening, she helps her father fold new prize toys and put them on the shelf. Last night, she folded toys behind the stand from seven thirty until closing time. She did not walk to the front of the stand.',
        question: 'What did Ya do last night?',
        options: ['She folded toys behind the stand.', 'She played with the stuffed bear.', 'She watched the pinball stand.'],
        a: 0,
        explainZh: '文章寫 she folded toys behind the stand...did not walk to the front，直接說明她整晚都待在攤位後面，可以排除她的嫌疑。',
        clueZh: '小雅整晚都在攤位後面摺新的獎品玩偶，沒有走到攤位前面，可以排除她的嫌疑。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '小恩', zh: '常來套圈圈的小男孩' },
        { emoji: '👧', name: '小雅', zh: '老闆的女兒' },
        { emoji: '🧑', name: '阿伯', zh: '隔壁彈珠台老闆' },
        { emoji: '👩', name: '媽媽', zh: '小恩的媽媽' },
      ],
      answer: 0,
      clueZh: '小恩謊稱七點就回家，但監視器拍到八點有個男孩站在攤位前；目擊者也看到戴黃帽、抱著軟軟棕色東西的小男孩；攤位下找到絨毛與小腳印；小雅整晚都在攤位後面摺玩偶，不可能是她。所有線索都指向小恩——他實在太想要那隻絨毛熊寶寶了，忍不住就把牠抱走，還沒付錢！',
    },
  },

  // ===== Case 11: 動物園浣熊逃脫記 =====
  {
    id: 'zoo',
    title: '動物園浣熊逃脫記',
    icon: '🦝',
    sceneZh: '動物園的浣熊「胖胖」竟然從籠子裡跑出來，把遊客的爆米花桶弄得到處都是！飼養員急著找出到底是誰忘了鎖好籠子門。',
    rooms: [
      {
        type: 'witness',
        descEn: 'This person wears a green uniform and a new name tag. She looks a little nervous. She was cleaning the raccoon cage this morning.',
        options: [
          { emoji: '👦', label: '阿凱' },
          { emoji: '👧', label: '婷婷' },
          { emoji: '🧑‍🔧', label: '老飼養員' },
          { emoji: '👨‍👩‍👧', label: '遊客爸爸' },
        ],
        a: 1,
        explainZh: 'green uniform、new name tag、nervous、cleaning the cage this morning，這些細節全都指向新來的實習生婷婷。',
        clueZh: '有人看到一位穿著綠色制服、掛著新名牌、看起來很緊張的女生，今天早上在浣熊籠附近打掃。',
      },
      {
        type: 'read',
        textEn: 'The old keeper has worked at the zoo for twenty years. Every morning, he checks all the cage locks one by one before breakfast. This morning, he checked the raccoon cage at seven o\'clock and it was locked tight. Then he went to feed the elephants.',
        question: 'What did the old keeper do at seven o\'clock this morning?',
        options: ['He checked that the raccoon cage was locked.', 'He forgot to lock the cage.', 'He fed the raccoon popcorn.'],
        a: 0,
        explainZh: '文章清楚說 he checked the raccoon cage at seven o\'clock and it was locked tight，可以排除老飼養員的嫌疑。',
        clueZh: '老飼養員今天早上七點檢查過浣熊籠，確認鎖得好好的，之後就去餵大象了，可以排除他的嫌疑。',
      },
      {
        type: 'code',
        riddleEn: 'I am a small animal. I have a black mask around my eyes. I have a striped tail and I like to eat popcorn.',
        answer: 'RACCOON',
        letterBank: ['R', 'A', 'C', 'C', 'O', 'O', 'N', 'T', 'S', 'E', 'L'],
        explainZh: '謎題描述「小動物、眼睛周圍有黑色面具、尾巴有條紋、喜歡吃爆米花」——答案是 raccoon（浣熊），就是這次逃跑的胖胖！',
        clueZh: '籠子門把上發現了一些新鮮的小手印，而且籠子的鎖頭是新裝上去，轉起來特別緊。',
      },
      {
        type: 'liar',
        factZh: '動物園的檢查紀錄簿顯示，今天早上第二次檢查那一欄是空白的，沒有人簽名。',
        statements: [
          { speaker: '👦 阿凱', textEn: 'I only looked at the raccoon through the glass and never touched the cage.' },
          { speaker: '🧑‍🔧 老飼養員', textEn: 'I did my morning check as always and everything was locked.' },
          { speaker: '👧 婷婷', textEn: 'I signed the check logbook after I checked the cage this morning.' },
        ],
        a: 2,
        explainZh: '檢查紀錄簿上第二次檢查那一欄是空白的，婷婷卻說自己有簽名，說法和紀錄矛盾，證明她在說謊。',
        clueZh: '婷婷聲稱自己檢查完籠子後有簽名，但紀錄簿上第二次檢查那一欄根本是空白的，她的話站不住腳。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿凱', zh: '愛看浣熊的小男孩' },
        { emoji: '👧', name: '婷婷', zh: '實習飼養員' },
        { emoji: '🧑‍🔧', name: '老飼養員', zh: '資深飼養員' },
        { emoji: '👨‍👩‍👧', name: '遊客爸爸', zh: '帶小孩來玩的遊客' },
      ],
      answer: 1,
      clueZh: '目擊者看到緊張的新人婷婷在浣熊籠附近打掃；老飼養員七點已經確認籠子鎖好，不可能是他；籠子鎖頭又新又緊、門把上有小手印；婷婷謊稱自己有簽檢查紀錄簿，但那一欄根本是空白的。所有線索都指向婷婷——她今天第一天上班太緊張，檢查完籠子後竟然忘記真正鎖緊，還誤以為自己簽了名！',
    },
  },

  // ===== Case 12: 海邊沙雕破壞事件 =====
  {
    id: 'beach',
    title: '海邊沙雕破壞事件',
    icon: '🏖️',
    sceneZh: '海邊沙雕比賽的冠軍作品「美人魚城堡」，一夜之間被踩壞了！評審非常生氣，你能找出到底是誰破壞了這座沙雕嗎？',
    rooms: [
      {
        type: 'code',
        riddleEn: 'I am made of tiny grains. I am found on the beach. Children use buckets to build me into castles.',
        answer: 'SAND',
        letterBank: ['S', 'A', 'N', 'D', 'T', 'O', 'E', 'R'],
        explainZh: '謎題描述「由細小顆粒組成、在海邊找到、小孩用桶子把我堆成城堡」——答案是 sand（沙），沙雕城堡正是用它堆成的！',
        clueZh: '被踩壞的沙雕旁邊，留下了一排清晰的赤腳腳印，一路通往露營區帳篷的方向。',
      },
      {
        type: 'liar',
        factZh: '露營區管理員記錄顯示，小海的帳篷探照燈昨晚十點半還亮著，直到十一點才熄滅。',
        statements: [
          { speaker: '👧 貝貝', textEn: 'I checked on my sandcastle at nine o\'clock and it was still perfect.' },
          { speaker: '🧑‍🦱 救生員', textEn: 'I finished my last patrol at ten o\'clock and then went to sleep.' },
          { speaker: '👦 小海', textEn: 'My tent light was off after nine o\'clock and I was sleeping.' },
        ],
        a: 2,
        explainZh: '管理員紀錄顯示小海的帳篷燈亮到十一點才熄滅，他卻說九點後就熄燈睡覺了，說法和紀錄矛盾，證明他在說謊。',
        clueZh: '小海聲稱九點後就熄燈睡覺，但管理員紀錄顯示他的帳篷燈亮到十一點才熄滅，他的說法漏洞百出。',
      },
      {
        type: 'read',
        textEn: 'Lele is a friendly dog who lives near the beach shop. Every night, the shop owner ties Lele\'s leash to a pole before closing at eight o\'clock. Lele stays there and sleeps until morning. He cannot reach the sandcastle area at all.',
        question: 'Where does Lele stay every night?',
        options: ['Tied to a pole near the beach shop.', 'Inside the sandcastle.', 'Patrolling the beach with the lifeguard.'],
        a: 0,
        explainZh: '文章說 the shop owner ties Lele\'s leash to a pole...Lele stays there，清楚說明牠晚上根本無法到達沙雕的地方，可以排除牠的嫌疑。',
        clueZh: '樂樂晚上都被拴在沙灘小舖旁的柱子上睡覺，根本沒辦法跑到沙雕那邊，可以排除牠的嫌疑。',
      },
      {
        type: 'witness',
        descEn: 'This person has sand all over his shorts. He looked very upset about losing the sandcastle contest. He was walking near the contest area very late at night.',
        options: [
          { emoji: '👧', label: '貝貝' },
          { emoji: '🐕', label: '樂樂' },
          { emoji: '🧑‍🦱', label: '救生員' },
          { emoji: '👦', label: '小海' },
        ],
        a: 3,
        explainZh: 'sand on his shorts、upset about losing the contest、walking near the area very late at night，這些描述正好指向落選的小海。',
        clueZh: '有人看到一個短褲上沾滿沙子、看起來很沮喪的男生，深夜還在比賽場地附近徘徊。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '小海', zh: '落選的參賽者' },
        { emoji: '👧', name: '貝貝', zh: '冠軍沙雕的作者' },
        { emoji: '🐕', name: '樂樂', zh: '沙灘狗' },
        { emoji: '🧑‍🦱', name: '救生員', zh: '巡邏沙灘的救生員' },
      ],
      answer: 0,
      clueZh: '沙雕旁的赤腳印一路通往帳篷方向；樂樂晚上都被拴住，不可能是牠；小海謊稱九點就熄燈睡覺，但帳篷燈其實亮到十一點；目擊者又看到沮喪的小海深夜徘徊在比賽場地附近。所有線索都指向小海——他因為輸掉比賽心裡不平衡，忍不住偷偷跑去踩壞了貝貝的冠軍沙雕！',
    },
  },

  // ===== Case 13: 太空營隕石失蹤 =====
  {
    id: 'space_camp',
    title: '太空營隕石失蹤',
    icon: '🚀',
    sceneZh: '太空夏令營裡，教練精心準備的「火星隕石模型」展示品不見了！所有小小太空人都聚在一起，準備找出兇手。',
    rooms: [
      {
        type: 'read',
        textEn: 'Xingxing is the team leader of her group. Every morning, she checks that all campers have made their beds. Yesterday morning, she checked every bed at eight o\'clock, then she led her group to the rocket workshop. She stayed in the workshop until lunch.',
        question: 'What did Xingxing do at eight o\'clock yesterday?',
        options: ['She checked that all campers had made their beds.', 'She took the meteorite model.', 'She flew a rocket.'],
        a: 0,
        explainZh: '文章直接寫 she checked that all campers had made their beds，加上之後整個上午都待在工作坊，可以排除她的嫌疑。',
        clueZh: '星星整個早上都在檢查大家的床鋪，之後又待在火箭工作坊裡到中午，可以排除她的嫌疑。',
      },
      {
        type: 'code',
        riddleEn: 'I come from outer space. I am a rock that falls from the sky. Scientists study me to learn about stars.',
        answer: 'METEOR',
        letterBank: ['M', 'E', 'T', 'E', 'O', 'R', 'S', 'A', 'N', 'L'],
        explainZh: '謎題描述「來自外太空、是從天上掉下來的石頭、科學家研究我來認識星星」——答案是 meteor（隕石），正是這次消失的展示品！',
        clueZh: '阿宇的床鋪底下，發現了一小塊和隕石模型相同材質的碎片。',
      },
      {
        type: 'liar',
        factZh: '教練保管隕石模型的展示櫃鑰匙從來不離身，而且他昨晚十點就已經在自己的房間睡著了。',
        statements: [
          { speaker: '👦 小凡', textEn: 'I was too shy to leave my bed and I stayed there all night.' },
          { speaker: '👦 阿宇', textEn: 'I looked at the meteorite model through the glass but never touched the case.' },
          { speaker: '🧑‍🚀 教練', textEn: 'I was patrolling the camp with my flashlight until midnight.' },
        ],
        a: 2,
        explainZh: '事實是教練十點就已經睡著了，他卻說自己巡邏到半夜，說法互相矛盾——原來他值班時打瞌睡，不好意思承認。',
        clueZh: '教練聲稱自己巡邏到半夜，但其實他十點就已經睡著了，他的說法對不上，顯然是在掩飾自己值班打瞌睡的糗事。',
      },
      {
        type: 'witness',
        descEn: 'This person often talks about rocks and space dust. He was seen carrying something wrapped in a blanket back to his own bed late at night.',
        options: [
          { emoji: '👧', label: '星星' },
          { emoji: '🧑‍🚀', label: '教練' },
          { emoji: '👦', label: '小凡' },
          { emoji: '👦', label: '阿宇' },
        ],
        a: 3,
        explainZh: 'talks about rocks and space dust、carrying something wrapped in a blanket to his bed at night，正好描述著迷隕石模型的阿宇。',
        clueZh: '有人看到一個很愛聊石頭和太空塵的男生，深夜抱著用毯子包住的東西回到自己床上。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿宇', zh: '著迷太空石頭的男生' },
        { emoji: '👧', name: '星星', zh: '營隊裡的小隊長' },
        { emoji: '🧑‍🚀', name: '教練', zh: '太空營的指導教練' },
        { emoji: '👦', name: '小凡', zh: '剛轉來的害羞男生' },
      ],
      answer: 0,
      clueZh: '星星整個早上都在檢查床鋪和待在工作坊，不可能是她；教練的謊言只是掩飾自己打瞌睡，和案件無關；阿宇的床鋪底下找到隕石碎片；目擊者又看到他深夜抱著用毯子包住的東西回床上。所有線索都指向阿宇——他實在太著迷隕石模型了，忍不住把它偷偷抱回床上仔細研究！',
    },
  },

  // ===== Case 14: 魔法城堡權杖疑雲 =====
  {
    id: 'magic_castle',
    title: '魔法城堡權杖疑雲',
    icon: '🪄',
    sceneZh: '遊樂園「魔法城堡」表演，主持人的魔法權杖竟然在表演前不見了！沒有權杖，精彩的魔術秀就要開天窗，你能在開演前找回權杖嗎？',
    rooms: [
      {
        type: 'witness',
        descEn: 'This person is small and wears a purple star sticker on her cheek. She was standing very close to the prop table before the show. She looked very excited about magic.',
        options: [
          { emoji: '👦', label: '阿翔' },
          { emoji: '🧑‍🎤', label: '主持人' },
          { emoji: '🧸', label: '吉祥物' },
          { emoji: '👧', label: '小茜' },
        ],
        a: 3,
        explainZh: 'small、purple star sticker、close to the prop table、excited about magic，這些細節都指向小茜。',
        clueZh: '有人看到一個臉頰貼著紫色星星貼紙的小女孩，表演前一直站在道具桌旁邊，看起來對魔法非常興奮。',
      },
      {
        type: 'liar',
        factZh: '城堡吉祥物的布偶裝又大又重，穿上之後完全沒辦法用手指拿小東西，只能用整隻手臂大動作揮舞。',
        statements: [
          { speaker: '🧸 吉祥物', textEn: 'I picked up the small magic wand carefully with my fingers.' },
          { speaker: '👦 阿翔', textEn: 'I was selling tickets at the front gate all afternoon.' },
          { speaker: '🧑‍🎤 主持人', textEn: 'I put the wand on the prop table right before the show.' },
        ],
        a: 0,
        explainZh: '布偶裝根本沒辦法用手指拿東西，吉祥物卻說自己「小心地用手指拿起權杖」，這和布偶裝的限制矛盾，證明他在說謊——其實他只是想邀功。',
        clueZh: '吉祥物聲稱自己用手指小心拿起權杖，但布偶裝根本沒辦法做出這種精細動作，他的說法完全站不住腳。',
      },
      {
        type: 'code',
        riddleEn: 'I am long and thin like a stick. Magicians wave me and say magic words. I can make things disappear.',
        answer: 'WAND',
        letterBank: ['W', 'A', 'N', 'D', 'S', 'T', 'O', 'E'],
        explainZh: '謎題描述「長長細細像一根棍子、魔術師會揮動我說魔法咒語、能讓東西消失」——答案是 wand（魔杖），正是這次消失的道具！',
        clueZh: '道具桌下方找到一張紫色星星貼紙，和目擊者描述的一模一樣。',
      },
      {
        type: 'read',
        textEn: 'The host practices his magic show every day. Before each show, he puts all his props on the table at three o\'clock. Yesterday, he put the wand on the table at three o\'clock, then he went to change his costume. He did not come back to the table until the show started.',
        question: 'When did the host put the wand on the table?',
        options: ['At three o\'clock.', 'Right before the show started.', 'He never used a wand.'],
        a: 0,
        explainZh: '文章寫 he put the wand on the table at three o\'clock，清楚回答了「何時」的問題，是找出特定資訊的重要閱讀技巧。',
        clueZh: '主持人三點就把權杖放上道具桌，之後就去換裝，一直到表演開始才回來，可以排除他監守自盜的可能。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👧', name: '小茜', zh: '喜歡魔術的小女孩' },
        { emoji: '👦', name: '阿翔', zh: '城堡打工的工讀生' },
        { emoji: '🧑‍🎤', name: '主持人', zh: '魔法城堡的表演主持人' },
        { emoji: '🧸', name: '吉祥物', zh: '穿布偶裝的表演人員' },
      ],
      answer: 0,
      clueZh: '目擊者看到貼著紫色星星貼紙、興奮地站在道具桌旁的小茜；道具桌下找到同款貼紙；吉祥物的謊言只是想邀功，布偶裝根本沒辦法精細拿東西；主持人三點就放好權杖，之後全程不在場。所有線索都指向小茜——她太想親手摸摸看魔法權杖，偷偷拿去試了試魔法，結果一緊張就忘記放回去了！',
    },
  },

  // ===== Case 15: 生日蠟燭消失記 =====
  {
    id: 'birthday_party',
    title: '生日蠟燭消失記',
    icon: '🕯️',
    sceneZh: '妹妹的生日派對上，插在蛋糕上最重要的「許願蠟燭」不見了！沒有蠟燭就不能許願吹蠟燭，壽星急得快哭出來了，你能找回蠟燭嗎？',
    rooms: [
      {
        type: 'code',
        riddleEn: 'I am tall and thin. I have a small flame on top. People blow me out and make a wish.',
        answer: 'CANDLE',
        letterBank: ['C', 'A', 'N', 'D', 'L', 'E', 'S', 'T', 'O', 'R'],
        explainZh: '謎題描述「又高又細、上面有小小的火焰、人們會把我吹熄並許願」——答案是 candle（蠟燭），正是壽星要用來許願的東西！',
        clueZh: '餐桌底下發現了一根融化了一半的蠟燭，旁邊還有幾滴蠟油。',
      },
      {
        type: 'witness',
        descEn: 'This person is very curious. She loves to touch new things without asking. She was seen near the birthday table holding something long and thin.',
        options: [
          { emoji: '👦', label: '弟弟' },
          { emoji: '👧', label: '表妹' },
          { emoji: '🐰', label: '寵物兔' },
          { emoji: '👨', label: '爸爸' },
        ],
        a: 1,
        explainZh: 'very curious、touches new things without asking、holding something long and thin near the table，正好描述好奇的表妹。',
        clueZh: '有人看到一個好奇心很重的女生，在生日蛋糕桌附近拿著長長細細的東西把玩。',
      },
      {
        type: 'read',
        textEn: 'Dad bought the birthday cake yesterday afternoon. He carefully put one candle on top of the cake before the party started. Then he went to the kitchen to prepare food. He did not touch the cake again until the party began.',
        question: 'What did Dad do before the party started?',
        options: ['He put a candle on the cake.', 'He ate the candle.', 'He hid the candle in his pocket.'],
        a: 0,
        explainZh: '文章明確寫出 he carefully put one candle on top of the cake before the party started，可以排除他的嫌疑。',
        clueZh: '爸爸派對前就仔細把蠟燭插在蛋糕上，之後就去廚房忙，沒有再碰過蛋糕，可以排除他的嫌疑。',
      },
      {
        type: 'liar',
        factZh: '派對開始前，所有人都在客廳玩遊戲，只有表妹自己說她想去洗手間，離開了大概十分鐘。',
        statements: [
          { speaker: '👦 弟弟', textEn: 'I was setting up party games with everyone in the living room.' },
          { speaker: '👨 爸爸', textEn: 'I was in the kitchen preparing food before the party.' },
          { speaker: '👧 表妹', textEn: 'I stayed in the living room with everyone the whole time before the party.' },
        ],
        a: 2,
        explainZh: '事實是表妹自己說要去洗手間，離開了大概十分鐘，她卻說全程都跟大家待在客廳，說法前後矛盾，證明她在說謊。',
        clueZh: '表妹聲稱自己全程都待在客廳，但她其實藉口說要去洗手間離開了大約十分鐘，說法完全對不上。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '弟弟', zh: '愛惡作劇的哥哥' },
        { emoji: '👧', name: '表妹', zh: '來作客的表妹' },
        { emoji: '🐰', name: '寵物兔', zh: '家裡養的兔子' },
        { emoji: '👨', name: '爸爸', zh: '準備蛋糕的爸爸' },
      ],
      answer: 1,
      clueZh: '餐桌下找到融化一半的蠟燭；目擊者看到好奇的表妹拿著長長細細的東西；爸爸派對前就準備好蛋糕，之後全程在廚房；表妹卻謊稱自己全程都在客廳，其實藉口去洗手間離開了十分鐘。所有線索都指向表妹——她太好奇蠟燭點燃的樣子，偷偷拿去客廳角落玩，結果蠟燭熄滅弄丟了，她也不敢承認！',
    },
  },

  // ===== Case 16: 農場南瓜破壞事件 =====
  {
    id: 'farm',
    title: '農場南瓜破壞事件',
    icon: '🎃',
    sceneZh: '農場南瓜比賽裡，種出全場最大南瓜的農夫爺爺，發現他的寶貝南瓜被人啃了一個大洞！到底是誰偷咬了南瓜？',
    rooms: [
      {
        type: 'liar',
        factZh: '監視器拍到小穗的腳踏車昨晚停在南瓜田邊，但小穗卻說自己整晚都沒來過。',
        statements: [
          { speaker: '👦 阿牛', textEn: 'I checked the goat\'s fence last night and it was closed tight.' },
          { speaker: '👴 農夫爺爺', textEn: 'I woke up at five and found the fence gate wide open.' },
          { speaker: '👧 小穗', textEn: 'I was at my own farm all night and never came to this pumpkin field.' },
        ],
        a: 2,
        explainZh: '監視器拍到小穗的腳踏車停在南瓜田邊，她卻說自己整晚都沒來過，說法和監視畫面矛盾，證明她在說謊——其實她只是想偷看比賽對手的南瓜，並沒有真的偷吃。',
        clueZh: '小穗聲稱整晚都沒來過南瓜田，但監視器卻拍到她的腳踏車停在田邊，她的說法有很大的漏洞。',
      },
      {
        type: 'read',
        textEn: 'Grandpa has grown pumpkins for thirty years. Every night, he waters the pumpkins at seven o\'clock and then goes inside to sleep. He does not go back outside until morning. Last night was the same as always.',
        question: 'What does Grandpa do every night at seven o\'clock?',
        options: ['He waters the pumpkins.', 'He eats a piece of pumpkin pie.', 'He checks the goat fence.'],
        a: 0,
        explainZh: '文章寫 he waters the pumpkins at seven o\'clock and then goes inside to sleep，加上「不會再出來直到早上」，可以排除他的嫌疑。',
        clueZh: '農夫爺爺每天晚上七點澆完水就進屋睡覺了，不會再出來，可以排除他的嫌疑。',
      },
      {
        type: 'witness',
        descEn: 'This animal has white fur and small horns. It loves to eat almost anything, even paper and cloth. It was seen standing right next to the big pumpkin this morning.',
        options: [
          { emoji: '👦', label: '阿牛' },
          { emoji: '🐐', label: '波比' },
          { emoji: '👧', label: '小穗' },
          { emoji: '👴', label: '農夫爺爺' },
        ],
        a: 1,
        explainZh: 'white fur、small horns、eats almost anything、standing next to the pumpkin this morning，清楚描述山羊波比。',
        clueZh: '有人看到一隻白色毛皮、有小角的山羊，今天早上就站在那顆大南瓜旁邊。',
      },
      {
        type: 'code',
        riddleEn: 'I am big, round, and orange. I grow on a vine in the field. People carve my face at Halloween.',
        answer: 'PUMPKIN',
        letterBank: ['P', 'U', 'M', 'P', 'K', 'I', 'N', 'S', 'T', 'O', 'A'],
        explainZh: '謎題描述「又大又圓、橘色的、長在田裡的藤蔓上、萬聖節會被刻成臉」——答案是 pumpkin（南瓜），正是被啃了一個洞的那顆！',
        clueZh: '南瓜的傷口上，清楚留下了兩排小小的牙齒咬痕，牙齒間距和山羊的牙齒完全吻合。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿牛', zh: '農夫的孫子' },
        { emoji: '🐐', name: '波比', zh: '農場養的山羊' },
        { emoji: '👧', name: '小穗', zh: '隔壁農場的女孩' },
        { emoji: '👴', name: '農夫爺爺', zh: '種南瓜的主人' },
      ],
      answer: 1,
      clueZh: '農夫爺爺七點澆完水就進屋睡覺，不可能是他；小穗雖然半夜偷偷跑來看南瓜，但監視器只拍到她的腳踏車，沒有咬痕的證據；目擊者看到白毛山羊站在南瓜旁邊；南瓜傷口上的牙齒咬痕更是和山羊的牙齒完全吻合。所有線索都指向波比——牠實在太貪吃了，趁大家不注意就咬了南瓜一大口！',
    },
  },

  // ===== Case 17: 游泳池哨子失竊案 =====
  {
    id: 'pool',
    title: '游泳池哨子失竊案',
    icon: '🏊',
    sceneZh: '社區游泳池的更衣室裡，救生員叔叔心愛的金色哨子不見了！沒有哨子，晚上的水中安全巡邏就少了重要工具。更衣室裡有好幾個人進進出出，你能拼湊出時間線，找出拿走哨子的人嗎？',
    rooms: [
      {
        type: 'read',
        textEn: 'Coach Wu trains the swim team every afternoon. Yesterday, he arrived at the pool at three o\'clock and started warm-up exercises with the whole team. At four o\'clock, he led the team to the locker room to change clothes. He stayed with the team the entire time and never went near the lifeguard\'s desk. After practice, he drove the team back to school at five thirty.',
        question: 'Where did Coach Wu stay during practice?',
        options: ['With the swim team the whole time.', "Near the lifeguard's desk.", 'Alone in the locker room.'],
        a: 0,
        explainZh: '文章清楚寫出 he stayed with the team the entire time and never went near the lifeguard\'s desk，直接說明他整段時間都跟隊員在一起，可以排除他的嫌疑。',
        clueZh: '教練整個下午都跟泳隊隊員待在一起，從沒靠近救生員的桌子，可以排除他的嫌疑。',
      },
      {
        type: 'liar',
        factZh: '更衣室的監視器顯示，救生員的哨子昨天下午四點半還掛在救生員桌上的掛鉤上，直到五點才不見蹤影，而下午四點半到五點之間，只有小蒂一個人進出過更衣室。',
        statements: [
          { speaker: '👦 阿正', textEn: 'I was warming up with the team until four o\'clock, then I went home early.' },
          { speaker: '👨‍🦽 老先生', textEn: 'I finished swimming at four o\'clock and left the pool right away.' },
          { speaker: '👧 小蒂', textEn: 'I was cleaning the pool deck outside from four thirty to five o\'clock and never entered the locker room.' },
        ],
        a: 2,
        explainZh: '監視器紀錄顯示四點半到五點之間只有小蒂進出過更衣室，她卻說自己整段時間都在池畔打掃、根本沒進更衣室，這和監視畫面直接矛盾，證明她在說謊。',
        clueZh: '小蒂聲稱四點半到五點都在池畔打掃、沒進過更衣室，但監視器畫面顯示那段時間只有她一個人進出更衣室，說法完全對不上。',
      },
      {
        type: 'code',
        riddleEn: 'I am small and round. I have a metal ring or a small ball inside. Lifeguards blow me to warn swimmers.',
        answer: 'WHISTLE',
        letterBank: ['W', 'H', 'I', 'S', 'T', 'L', 'E', 'A', 'O', 'N', 'R'],
        explainZh: '謎題描述「小小圓圓的、裡面有金屬環或小球、救生員用來吹哨警告泳客」——答案是 whistle（哨子），正是這次消失的重要工具！',
        clueZh: '救生員桌子底下，找到一小段哨繩的碎片，剪斷的痕跡看起來像是被匆忙扯斷的。',
      },
      {
        type: 'witness',
        descEn: 'This person wears a red training shirt with "TRAINEE" printed on the back. She was seen standing near the lifeguard\'s desk around four forty, holding something small and shiny close to her mouth.',
        options: [
          { emoji: '👦', label: '阿正' },
          { emoji: '👧', label: '小蒂' },
          { emoji: '🧑‍🦰', label: '教練' },
          { emoji: '👨‍🦽', label: '老先生' },
        ],
        a: 1,
        explainZh: 'red "TRAINEE" shirt、standing near the desk around four forty、holding something small and shiny near her mouth，正好描述受訓中的小蒂。',
        clueZh: '有人看到一位穿著印有「TRAINEE」字樣紅色訓練服的女生，四點四十分左右站在救生員桌子附近，手上拿著小小發亮的東西湊近嘴邊。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿正', zh: '緊張的泳隊隊員' },
        { emoji: '👧', name: '小蒂', zh: '受訓中的救生員助手' },
        { emoji: '🧑‍🦰', name: '教練', zh: '泳隊教練' },
        { emoji: '👨‍🦽', name: '老先生', zh: '每天來運動的長輩' },
      ],
      answer: 1,
      clueZh: '教練整個下午都跟隊員在一起，不可能是他；監視器顯示四點半到五點只有小蒂進出更衣室，她卻謊稱自己在池畔打掃；目擊者又看到她四點四十分拿著小小發亮的東西湊近嘴邊；救生員桌下還留有被扯斷的哨繩碎片。所有線索都指向小蒂——她受訓時太好奇吹哨子是什麼感覺，忍不住拿去試了試，結果太緊張就忘記放回去了！',
    },
  },

  // ===== Case 18: 美術教室飛天龍事件 =====
  {
    id: 'art_room',
    title: '美術教室飛天龍事件',
    icon: '🐉',
    sceneZh: '美術教室裡，準備參加全國比賽的黏土雕塑作品「飛天龍」在放學後被打碎了一大塊！這件作品花了整整三個月才完成，老師心疼得快要落淚，好幾位學生放學後都還留在教室附近，你能找出兇手嗎？',
    rooms: [
      {
        type: 'witness',
        descEn: 'This person was seen carrying a mop and a bucket near the art room door around five o\'clock. He looked worried and kept glancing back at the sculpture table. A small piece of clay was stuck to the bottom of his shoe.',
        options: [
          { emoji: '👦', label: '阿凱' },
          { emoji: '👧', label: '允熙' },
          { emoji: '🧑‍🎨', label: '美術老師' },
          { emoji: '👦', label: '小樂' },
        ],
        a: 3,
        explainZh: 'mop and bucket、worried、glancing at the sculpture table、clay stuck to his shoe，全都指向打掃值日生小樂。',
        clueZh: '有人看到一個拿著拖把和水桶的男生，五點左右在美術教室門口徘徊，一直不安地回頭看雕塑桌，鞋底還黏著一小塊黏土。',
      },
      {
        type: 'code',
        riddleEn: 'I am a big and powerful creature in stories. I can fly and breathe fire. Many books and movies tell tales about me.',
        answer: 'DRAGON',
        letterBank: ['D', 'R', 'A', 'G', 'O', 'N', 'S', 'T', 'E', 'L'],
        explainZh: '謎題描述「故事裡強大的生物、會飛、會噴火、很多書和電影都會提到我」——答案是 dragon（龍），正是這件被打碎的黏土雕塑「飛天龍」！',
        clueZh: '雕塑桌旁邊的地上，散落著好幾片龍尾巴形狀的黏土碎片。',
      },
      {
        type: 'read',
        textEn: 'Yunxi spent three months making the clay dragon sculpture. Yesterday afternoon, she finished the last details and showed it to the teacher. The teacher was very happy and asked her to leave it on the table to dry. Yunxi then left the art room at four o\'clock to catch her school bus. She did not come back to the art room after that.',
        question: 'What did Yunxi do at four o\'clock yesterday?',
        options: ['She left the art room to catch her school bus.', 'She broke the sculpture by accident.', 'She started making a new sculpture.'],
        a: 0,
        explainZh: '文章寫出 Yunxi then left the art room at four o\'clock to catch her school bus，並且之後沒有再回到教室，可以排除她的嫌疑。',
        clueZh: '允熙四點就離開美術教室去搭校車了，之後沒有再回來，可以排除她的嫌疑。',
      },
      {
        type: 'liar',
        factZh: '值日生的打掃工作表顯示，小樂負責在放學後五點整鎖上美術教室的門，而他打掃教室的路線一定會經過擺放雕塑的桌子。',
        statements: [
          { speaker: '👦 阿凱', textEn: 'I left school right after class and went straight home.' },
          { speaker: '🧑‍🎨 美術老師', textEn: 'I checked the sculpture at three thirty and it was still perfect.' },
          { speaker: '👦 小樂', textEn: 'I cleaned the classroom without ever going near the sculpture table.' },
        ],
        a: 2,
        explainZh: '打掃工作表顯示小樂的打掃路線一定會經過雕塑桌，他卻說自己完全沒有靠近雕塑桌，這和工作表上的路線矛盾，證明他在說謊。',
        clueZh: '小樂聲稱打掃時完全沒有靠近雕塑桌，但工作表顯示他的打掃路線一定會經過那張桌子，他的說法根本站不住腳。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿凱', zh: '作品沒被選上的學生' },
        { emoji: '👧', name: '允熙', zh: '飛天龍的作者' },
        { emoji: '🧑‍🎨', name: '美術老師', zh: '指導老師' },
        { emoji: '👦', name: '小樂', zh: '打掃值日生' },
      ],
      answer: 3,
      clueZh: '允熙四點就離開學校搭校車，不可能是她；老師三點半檢查時雕塑還很完整；目擊者看到小樂五點左右在教室門口不安徘徊、鞋底還黏著黏土；他又謊稱打掃時沒靠近雕塑桌，但工作表顯示他的路線一定會經過那裡。所有線索都指向小樂——他打掃時不小心撞倒了雕塑，因為太害怕被罵，一直不敢承認！',
    },
  },

  // ===== Case 19: 百貨公司薑餅屋疑案 =====
  {
    id: 'department_store',
    title: '百貨公司薑餅屋疑案',
    icon: '🍪',
    sceneZh: '百貨公司耶誕節的巨型薑餅屋展示品，一早開店就發現屋頂被咬掉了一大塊！保全人員調閱了監視器畫面，卻發現案發時間電力剛好短暫故障，畫面是黑的。你能靠其他線索找出真正的兇手嗎？',
    rooms: [
      {
        type: 'code',
        riddleEn: 'I am a sweet, crunchy treat. Bakers use me to build a small house at Christmas time. Children often want to take a bite of me.',
        answer: 'COOKIE',
        letterBank: ['C', 'O', 'O', 'K', 'I', 'E', 'S', 'T', 'A', 'N'],
        explainZh: '謎題描述「香甜酥脆的點心、烘焙師耶誕節會用我蓋成小房子、小朋友常常忍不住想咬一口」——答案是 cookie（餅乾），正是薑餅屋被咬掉的那個部分！',
        clueZh: '薑餅屋缺角的地方留下了清楚的牙齒咬痕，旁邊還掉了幾顆薑餅屑。',
      },
      {
        type: 'read',
        textEn: 'Ting works part-time at the store during the Christmas season. Every morning, she arrives at eight thirty to set up the decorations before the store opens at ten. Yesterday morning, she felt very hungry because she skipped breakfast. She was alone near the gingerbread house display from eight thirty until nine o\'clock. Then her manager arrived and they set up the rest of the decorations together.',
        question: 'How did Ting feel yesterday morning?',
        options: ['She felt very hungry because she skipped breakfast.', 'She felt sleepy and wanted to go home.', 'She felt excited about the electricity problem.'],
        a: 0,
        explainZh: '文章寫出 she felt very hungry because she skipped breakfast，並且她從八點半到九點獨自一人待在薑餅屋展示區，這段描述其實正是重要的破案線索，閱讀時要留意每個細節，不能只看表面。',
        clueZh: '亭亭那天早上因為沒吃早餐肚子很餓，而且從八點半到九點，她一個人獨自待在薑餅屋展示區。',
      },
      {
        type: 'witness',
        descEn: 'This person has small cookie crumbs on the corner of her mouth. She was standing alone near the gingerbread house before the store opened. She works there wearing a Christmas elf costume.',
        options: [
          { emoji: '👦', label: '小翔' },
          { emoji: '👧', label: '亭亭' },
          { emoji: '🧑‍💼', label: '櫃姐' },
          { emoji: '👴', label: '保全爺爺' },
        ],
        a: 1,
        explainZh: 'cookie crumbs on her mouth、standing alone near the display before opening、wearing a Christmas elf costume，全都指向工讀生亭亭。',
        clueZh: '有人看到一位穿著耶誕精靈服裝、嘴角沾著餅乾屑的女生，開店前獨自站在薑餅屋展示區附近。',
      },
      {
        type: 'liar',
        factZh: '保全紀錄顯示，昨天早上八點四十五分到八點五十分之間，展示區那一層樓確實發生短暫停電，監視器沒有拍到畫面；但保全爺爺當時人在頂樓機房修理電源，完全不在展示區樓層。',
        statements: [
          { speaker: '👴 保全爺爺', textEn: 'I was standing right next to the gingerbread house when the electricity went out.' },
          { speaker: '🧑‍💼 櫃姐', textEn: 'I arrived at nine o\'clock and helped set up the rest of the decorations.' },
          { speaker: '👧 亭亭', textEn: 'I was alone near the display from eight thirty until nine o\'clock.' },
        ],
        a: 0,
        explainZh: '保全紀錄顯示保全爺爺當時人在頂樓機房修理電源，根本不在展示區樓層，他卻說自己「就站在薑餅屋旁邊」，說法和紀錄矛盾——他其實只是想證明自己盡忠職守，才誇大了自己的位置。',
        clueZh: '保全爺爺聲稱停電時自己就站在薑餅屋旁邊，但紀錄顯示他當時人在頂樓機房修理電源，說法完全對不上。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '小翔', zh: '跟著媽媽逛街的小男孩' },
        { emoji: '👧', name: '亭亭', zh: '耶誕活動工讀生' },
        { emoji: '🧑‍💼', name: '櫃姐', zh: '負責展示區的專櫃姐姐' },
        { emoji: '👴', name: '保全爺爺', zh: '夜間保全人員' },
      ],
      answer: 1,
      clueZh: '薑餅屋缺角處留下清楚的牙齒咬痕；亭亭當天沒吃早餐肚子很餓，八點半到九點又獨自待在展示區；目擊者也看到她嘴角沾著餅乾屑；保全爺爺的謊言只是想證明自己盡忠職守，和案件無關；停電正好發生在她獨自看守的那段時間。所有線索都指向亭亭——她實在太餓了，忍不住偷咬了一口薑餅屋！',
    },
  },

  // ===== Case 20: 露營區棉花糖失竊案 =====
  {
    id: 'campsite',
    title: '露營區棉花糖失竊案',
    icon: '🏕️',
    sceneZh: '露營區的營火晚會上，主辦單位精心準備的巨大棉花糖庫存竟然一夜之間少了一大半！明天還有兩百位小朋友要來烤棉花糖，你能在天亮前找出偷吃棉花糖的人嗎？',
    rooms: [
      {
        type: 'liar',
        factZh: '補給倉庫的門昨晚十點就被管理員上鎖，鑰匙只有管理員一人保管，而且倉庫牆角有一個一直沒修補的小縫隙。',
        statements: [
          { speaker: '🧑‍🏕️ 管理員', textEn: 'I checked the lock this morning and it was still closed, just as I left it.' },
          { speaker: '👦 阿寬', textEn: 'I used the spare key to open the storage door and get a snack for my siblings.' },
          { speaker: '👧 小霓', textEn: 'I organized all the marshmallow bags at nine o\'clock and then went to sleep in my tent.' },
        ],
        a: 1,
        explainZh: '事實是鑰匙只有管理員一人保管，根本沒有備用鑰匙，阿寬卻說自己用備用鑰匙開倉庫拿零食，說法明顯不合理——他其實只是想幫弟弟妹妹找零食，隨口編了個藉口。',
        clueZh: '阿寬聲稱自己用備用鑰匙打開倉庫拿零食，但鑰匙其實只有管理員一人保管，根本沒有備用鑰匙，他的說法漏洞百出。',
      },
      {
        type: 'witness',
        descEn: 'This creature has a black mask around its eyes and a striped, bushy tail. It was seen standing on its back legs near the storage tent late at night. It was holding something white and sticky in its front paws.',
        options: [
          { emoji: '👦', label: '阿寬' },
          { emoji: '🦝', label: '浣熊' },
          { emoji: '👧', label: '小霓' },
          { emoji: '🧑‍🏕️', label: '管理員' },
        ],
        a: 1,
        explainZh: 'black mask around the eyes、striped bushy tail、standing on its back legs、holding something white and sticky，清楚描述那隻野生浣熊。',
        clueZh: '有人看到一隻眼睛周圍有黑色面具、尾巴有條紋的動物，深夜站在補給帳篷附近，前腳還抓著白白黏黏的東西。',
      },
      {
        type: 'read',
        textEn: 'The campground manager checks the storage tent every night before he goes to sleep. Last night, he counted all the marshmallow bags at nine forty-five and locked the door at ten o\'clock. He kept the only key in his own pocket all night. This morning, he found the lock still closed, but there was a small gap in the corner of the tent wall that had never been fixed.',
        question: 'What did the manager find this morning?',
        options: ['The lock was still closed, but there was a small gap in the tent wall.', 'The door was wide open.', 'The key was missing from his pocket.'],
        a: 0,
        explainZh: '文章寫出 he found the lock still closed, but there was a small gap in the corner of the tent wall，提醒我們東西不一定要從門口進出，帳篷牆角的縫隙才是真正的破案關鍵。',
        clueZh: '管理員整晚都把唯一的鑰匙放在口袋裡，鎖也完好無缺，但帳篷牆角有一個一直沒修補的小縫隙。',
      },
      {
        type: 'code',
        riddleEn: 'I am little treats that taste good. People often eat me between meals. Campers keep me in bags inside the storage tent.',
        answer: 'SNACKS',
        letterBank: ['S', 'N', 'A', 'C', 'K', 'S', 'T', 'O', 'E', 'R'],
        explainZh: '謎題描述「好吃的小點心、常在正餐之間食用、露營客把我裝在袋子裡放在倉庫帳篷」——答案是 snacks（零食），也就是棉花糖這類消失的補給品！',
        clueZh: '倉庫帳篷角落的縫隙旁邊，散落著好幾個被咬破的零食袋子，裡面的棉花糖幾乎被搬空。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿寬', zh: '帶弟妹露營的哥哥' },
        { emoji: '🦝', name: '浣熊', zh: '常在營地附近出沒的野生浣熊' },
        { emoji: '👧', name: '小霓', zh: '整理營火晚會道具的志工' },
        { emoji: '🧑‍🏕️', name: '露營區管理員', zh: '負責看管補給品倉庫' },
      ],
      answer: 1,
      clueZh: '管理員整晚都把唯一鑰匙放在口袋裡，門鎖完好無缺，但帳篷牆角有個一直沒修補的縫隙；縫隙旁散落著被咬破的零食袋；目擊者看到有黑色面具、條紋尾巴的動物深夜出現在倉庫附近；阿寬謊稱自己用備用鑰匙開倉庫，但根本沒有備用鑰匙，他其實沒有真的進去。所有線索都指向那隻浣熊——牠從牆角的縫隙鑽進倉庫，把棉花糖偷吃了個精光！',
    },
  },

  // ===== Case 21: 火車站募款箱疑雲 =====
  {
    id: 'train_station',
    title: '火車站募款箱疑雲',
    icon: '🚉',
    sceneZh: '火車站裡，準備捐給育幼院的愛心募款箱不見了！箱子裡裝著這個月大家投入的所有零錢，站長非常著急。監視器畫面因為角度問題只拍到模糊的背影，你能靠其他線索找出真正拿走募款箱的人嗎？',
    rooms: [
      {
        type: 'read',
        textEn: 'The station master arrives at the station every morning at six o\'clock. Yesterday, he checked the donation box at seven o\'clock and it was still on the counter. He then went to the ticket office to help passengers buy tickets. He stayed in the ticket office the whole morning and did not walk past the counter again until noon.',
        question: 'What did the station master do at seven o\'clock yesterday?',
        options: ['He checked the donation box on the counter.', 'He moved the donation box to another platform.', 'He counted all the coins inside the box.'],
        a: 0,
        explainZh: '文章清楚寫出 he checked the donation box at seven o\'clock and it was still on the counter，之後整個早上都待在售票處，可以排除他的嫌疑。',
        clueZh: '站長七點檢查過募款箱還在櫃檯上，之後整個早上都待在售票處，沒有再經過那裡，可以排除他的嫌疑。',
      },
      {
        type: 'code',
        riddleEn: 'I am small, round, and made of metal. People drop me into a donation box to help others. I make a jingling sound.',
        answer: 'COINS',
        letterBank: ['C', 'O', 'I', 'N', 'S', 'T', 'A', 'E', 'R'],
        explainZh: '謎題描述「小小圓圓的金屬物品、被投進募款箱幫助別人、會發出叮叮噹噹的聲音」——答案是 coins（硬幣），正是募款箱裡裝的東西！',
        clueZh: '月台儲藏室的地上，散落著幾枚滾出來的硬幣，正好是通往募款箱下落的重要線索。',
      },
      {
        type: 'liar',
        factZh: '車站的月台儲藏室平常上鎖，只有站長和值班的清潔人員有鑰匙；但昨天下午，清潔人員為了搬運清潔用具，把儲藏室的門開著沒有關，一直到晚上六點才鎖上。',
        statements: [
          { speaker: '👧 曉夢', textEn: 'I was working at the station shop the whole afternoon and never left the counter.' },
          { speaker: '🧑‍✈️ 站長', textEn: 'I stayed in the ticket office all morning and only went to the storage room once, after six o\'clock.' },
          { speaker: '👦 阿翰', textEn: 'I never went near the storage room on the platform yesterday.' },
        ],
        a: 2,
        explainZh: '事實是月台儲藏室昨天下午一直開著沒鎖，任何人都可能進去；後續在儲藏室找到的證物都指向阿翰，他卻堅稱自己「從未靠近過儲藏室」，這和證物矛盾，證明他在說謊。',
        clueZh: '阿翰堅稱自己從未靠近過月台儲藏室，但儲藏室裡卻找到了募款箱和滾落的硬幣，他的說法完全站不住腳。',
      },
      {
        type: 'witness',
        descEn: 'This person wears a school uniform with a red backpack. He was seen carrying a heavy box toward the platform storage room around four o\'clock. He looked around nervously before going inside.',
        options: [
          { emoji: '👧', label: '曉夢' },
          { emoji: '🧑‍✈️', label: '站長' },
          { emoji: '👴', label: '遊民爺爺' },
          { emoji: '👦', label: '阿翰' },
        ],
        a: 3,
        explainZh: 'school uniform、red backpack、carrying a heavy box toward the storage room、looking around nervously，全都指向阿翰。',
        clueZh: '有人看到一個穿著校服、背著紅色背包的男生，四點左右扛著一個沉重的箱子走向月台儲藏室，進去前還緊張地東張西望。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿翰', zh: '等車的高中生' },
        { emoji: '👧', name: '曉夢', zh: '車站商店的工讀生' },
        { emoji: '🧑‍✈️', name: '站長', zh: '火車站站長' },
        { emoji: '👴', name: '遊民爺爺', zh: '常在車站附近休息的老爺爺' },
      ],
      answer: 0,
      clueZh: '站長七點檢查後整個早上都在售票處，不可能是他；月台儲藏室下午一直沒鎖，任何人都能進去；儲藏室裡找到募款箱和滾落的硬幣；目擊者又看到阿翰四點扛著沉重箱子、緊張地走進儲藏室；他卻堅稱自己從未靠近過那裡，說法完全站不住腳。所有線索都指向阿翰——他原本只是想幫忙把募款箱搬到更顯眼的地方，結果忘記告訴任何人，緊張之下才不敢承認！',
    },
  },

  // ===== Case 22: 寵物店兔子失蹤記 =====
  {
    id: 'pet_shop',
    title: '寵物店兔子失蹤記',
    icon: '🐰',
    sceneZh: '寵物店櫥窗裡最受歡迎的小兔子「棉花糖」，一早開店竟然發現籠子的門開著，兔子不見了！老闆娘急壞了，附近監視器角度不好只拍到模糊的身影，你能靠線索找出真相嗎？',
    rooms: [
      {
        type: 'witness',
        descEn: 'This person was seen holding the rabbit gently outside its cage around closing time. He looked happy and kept petting its soft fur. He put the rabbit down on the counter and walked away to answer the phone.',
        options: [
          { emoji: '👧', label: '小雪' },
          { emoji: '👦', label: '阿泰' },
          { emoji: '🧑‍🔧', label: '送貨員' },
          { emoji: '🐈', label: '咪咪' },
        ],
        a: 1,
        explainZh: 'holding the rabbit outside its cage、petting its fur、putting it on the counter to answer the phone，正好描述顧店的阿泰。',
        clueZh: '有人看到一個男生打烊前把兔子輕輕抱出籠子把玩，還把牠放在櫃檯上，接著就跑去接電話了。',
      },
      {
        type: 'liar',
        factZh: '老闆娘的簽收單顯示，送貨員每天早上七點送飼料來，昨天他七點十五分就已經開車離開了，前往下一家店送貨；監視器拍到七點半時，還有一個模糊的身影在寵物店櫃檯附近走動。',
        statements: [
          { speaker: '🧑‍🔧 送貨員', textEn: 'I stayed at the pet shop until eight o\'clock to help clean the cages.' },
          { speaker: '👧 小雪', textEn: 'I did not come to the pet shop yesterday evening at all.' },
          { speaker: '👦 阿泰', textEn: 'I was in the back room doing homework the whole evening.' },
        ],
        a: 0,
        explainZh: '簽收單顯示送貨員七點十五分就已經離開去送下一家店，他卻說自己待到八點幫忙清潔籠子，說法和簽收紀錄矛盾——他其實只是不好意思承認自己動作太快、沒有多留下來幫忙。',
        clueZh: '送貨員聲稱自己待到八點幫忙清潔籠子，但簽收單顯示他七點十五分就已經離開去送下一家店，說法完全對不上。',
      },
      {
        type: 'read',
        textEn: 'Xiaoxue visits the pet shop every day after school to look at the rabbit through the window. Yesterday, she arrived at four thirty and stood outside the shop for ten minutes. The shop was already closing, so the owner asked her to come back tomorrow. She waved goodbye to the rabbit through the glass and walked home with her mother.',
        question: 'What did Xiaoxue do at the pet shop yesterday?',
        options: ['She looked at the rabbit through the window and then went home.', 'She opened the cage to pet the rabbit.', 'She stayed until closing time to help clean.'],
        a: 0,
        explainZh: '文章寫出 She waved goodbye to the rabbit through the glass and walked home，清楚說明她從頭到尾都沒有進到店裡，可以排除她的嫌疑。',
        clueZh: '小雪只是隔著玻璃看了兔子就跟媽媽回家了，根本沒有進到店裡，可以排除她的嫌疑。',
      },
      {
        type: 'code',
        riddleEn: 'I am a small, soft animal with long ears. I love to eat carrots and hop around. Children think I look like a ball of cotton.',
        answer: 'RABBIT',
        letterBank: ['R', 'A', 'B', 'B', 'I', 'T', 'S', 'O', 'N', 'E'],
        explainZh: '謎題描述「小小軟軟的動物、有長長的耳朵、喜歡吃紅蘿蔔會跳來跳去、看起來像一團棉花」——答案是 rabbit（兔子），正是這次不見的棉花糖！',
        clueZh: '店裡後方的紙箱堆後面，發現了幾根兔子的軟毛，還有一串小小的腳印通往儲藏室角落。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👧', name: '小雪', zh: '常來看兔子的小女孩' },
        { emoji: '👦', name: '阿泰', zh: '老闆的兒子' },
        { emoji: '🧑‍🔧', name: '送貨員', zh: '每天送飼料的送貨員' },
        { emoji: '🐈', name: '咪咪', zh: '寵物店裡養的貓' },
      ],
      answer: 1,
      clueZh: '小雪只是隔著玻璃看看就回家了，不可能是她；送貨員的簽收單顯示他七點十五分就已經離開，他卻謊稱待到八點；目擊者看到阿泰打烊前把兔子抱出籠子玩，還放在櫃檯上跑去接電話；紙箱堆後也找到兔毛和通往儲藏室的腳印。所有線索都指向阿泰——他顧店時忍不住把兔子抱出來玩，接電話時忘記關好籠子門，兔子才自己跑出去躲了起來！',
    },
  },

  // ===== Case 23: 科展太陽能小車破壞事件 =====
  {
    id: 'science_lab',
    title: '科展太陽能小車破壞事件',
    icon: '⚙️',
    sceneZh: '學校科展的得獎作品「太陽能小車模型」，展示前竟然被拆掉了一顆重要的零件，車子完全無法動！這是全校科展最有希望得名的作品，你能在評審到來前找出真相嗎？',
    rooms: [
      {
        type: 'code',
        riddleEn: 'I am a small machine part. I turn electricity into movement. Cars and toy vehicles need me to move forward.',
        answer: 'MOTOR',
        letterBank: ['M', 'O', 'T', 'O', 'R', 'S', 'A', 'N', 'E'],
        explainZh: '謎題描述「小小的機械零件、把電力轉換成動力、車子需要我才能往前移動」——答案是 motor（馬達），太陽能小車正是靠我才能跑起來！',
        clueZh: '展示桌底下，找到了一顆被拆下來的小齒輪，齒輪邊緣還留有明顯的指甲刮痕。',
      },
      {
        type: 'witness',
        descEn: 'This person often complains that his own project is not good enough. He was seen standing alone next to the solar car display around four o\'clock, holding a small screwdriver in his hand.',
        options: [
          { emoji: '👦', label: '阿哲' },
          { emoji: '👧', label: '依依' },
          { emoji: '🧑‍🔬', label: '科學老師' },
          { emoji: '👦', label: '阿誠' },
        ],
        a: 3,
        explainZh: 'complains his own project isn\'t good enough、standing alone with a screwdriver near the display around four o\'clock，正好指向嫉妒對手的阿誠。',
        clueZh: '有人看到一個常抱怨自己作品不夠好的男生，四點左右獨自站在太陽能小車展示旁，手上還拿著一支小螺絲起子。',
      },
      {
        type: 'liar',
        factZh: '科展會場的簽到本顯示，下午四點到四點半之間，只有阿誠一個人簽名進入展示區，其他參賽學生都還在教室準備海報。',
        statements: [
          { speaker: '👦 阿哲', textEn: 'I was setting up the poster board in the classroom the whole afternoon.' },
          { speaker: '👧 依依', textEn: 'I was drawing the poster with Ah-Zhe in the classroom until four thirty.' },
          { speaker: '👦 阿誠', textEn: 'I was in the classroom finishing my poster with everyone else at four o\'clock.' },
        ],
        a: 2,
        explainZh: '簽到本清楚顯示四點到四點半之間只有阿誠一人進入展示區，他卻說自己那時候在教室跟大家一起完成海報，說法和簽到紀錄矛盾，證明他在說謊。',
        clueZh: '阿誠聲稱四點時自己在教室跟大家一起做海報，但簽到本顯示那段時間只有他一人進入展示區，他的說法完全對不上。',
      },
      {
        type: 'read',
        textEn: 'Yiyi is in charge of the poster for the solar car project. Yesterday afternoon, she worked on the poster with Ah-Zhe in the classroom from three o\'clock until four thirty. She used colored markers to draw pictures of the sun and the car. She never went to the exhibition hall where the solar car was displayed. After finishing the poster, she and Ah-Zhe carried it together to the hall at five o\'clock.',
        question: 'What did Yiyi do from three o\'clock until four thirty?',
        options: ['She worked on the poster with Ah-Zhe in the classroom.', 'She took apart the gear on the solar car.', 'She stood alone next to the display.'],
        a: 0,
        explainZh: '文章清楚說明 she worked on the poster with Ah-Zhe in the classroom...She never went to the exhibition hall，可以排除她的嫌疑。',
        clueZh: '依依整個下午都跟阿哲在教室裡畫海報，從沒去過展示大廳，可以排除她的嫌疑。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿哲', zh: '製作太陽能小車的學生' },
        { emoji: '👧', name: '依依', zh: '負責畫海報的組員' },
        { emoji: '🧑‍🔬', name: '科學老師', zh: '科展指導老師' },
        { emoji: '👦', name: '阿誠', zh: '作品被淘汰的競爭對手' },
      ],
      answer: 3,
      clueZh: '依依整個下午都跟阿哲在教室畫海報，沒去過展示大廳；簽到本顯示四點到四點半只有阿誠一人進入展示區，他卻謊稱自己在教室做海報；目擊者又看到他拿著螺絲起子獨自站在展示旁；展示桌下找到的齒輪上還留著指甲刮痕。所有線索都指向阿誠——他因為嫉妒對手的作品比自己好，偷偷拆走了一顆齒輪，想讓對方出糗！',
    },
  },

  // ===== Case 24: 英語偵探社二季驚喜 =====
  {
    id: 'season2_finale',
    title: '英語偵探社二季驚喜',
    icon: '📌',
    sceneZh: '英語偵探社的社辦裡，掛在牆上、記錄著大家兩季以來破解的所有案件的「榮譽線索板」不見了！沒有了線索板，就像是失去了偵探社的靈魂。這是最特別的一次案件——因為，這次的嫌疑人，全部都是曾經一起破案的老朋友！',
    rooms: [
      {
        type: 'read',
        textEn: 'Coach Lin has been a volunteer advisor for the Detective Agency since season one. Yesterday afternoon, he stayed in the meeting room to plan the season two celebration party from two o\'clock until five o\'clock. He wrote party invitations for every member. He never touched the clue board on the wall. After the planning meeting, he went home to rest before the party.',
        question: 'What did Coach Lin do yesterday afternoon?',
        options: ['He planned the season two celebration party.', 'He took the clue board off the wall.', 'He solved a new mystery case alone.'],
        a: 0,
        explainZh: '文章清楚寫出 he stayed in the meeting room to plan the season two celebration party...He never touched the clue board，可以排除他的嫌疑。',
        clueZh: '林老師整個下午都在規劃第二季慶祝派對，從沒碰過牆上的線索板，可以排除他的嫌疑。',
      },
      {
        type: 'witness',
        descEn: 'This person was seen carrying a large wrapped object down the hallway around four o\'clock. He looked excited, not worried. He kept whispering "It will be a surprise" to himself.',
        options: [
          { emoji: '🕵️', label: '神秘快遞員' },
          { emoji: '🧑‍🏫', label: '林老師' },
          { emoji: '👦', label: '阿柏' },
          { emoji: '👧', label: '允熙' },
        ],
        a: 2,
        explainZh: 'carrying a large wrapped object、excited not worried、whispering about a surprise，這些細節都指向正在計畫驚喜的阿柏。',
        clueZh: '有人看到一個男生四點左右扛著一個用布包起來的大東西走過走廊，看起來很興奮而不是心虛，還一直小聲說著「這會是個驚喜」。',
      },
      {
        type: 'liar',
        factZh: '偵探社的簽到簿顯示，昨天下午三點到四點之間，只有阿柏一個人在社辦裡；而神秘快遞員下午一直在隔壁的倉庫幫忙搬新的展示櫃，完全沒有進過社辦。',
        statements: [
          { speaker: '🕵️ 神秘快遞員', textEn: 'I was inside the clubroom rearranging the clue board all afternoon.' },
          { speaker: '👦 阿柏', textEn: 'I was in the clubroom by myself from three to four o\'clock.' },
          { speaker: '👧 允熙', textEn: 'I was in the art room finishing a new clay sculpture the whole afternoon.' },
        ],
        a: 0,
        explainZh: '簽到簿顯示神秘快遞員下午一直在隔壁倉庫幫忙搬展示櫃，根本沒進過社辦，他卻說自己整個下午都在社辦裡整理線索板，說法和紀錄矛盾——他其實只是想證明自己已經徹底改過自新、很願意幫忙，才說了這個小謊。',
        clueZh: '神秘快遞員聲稱自己整個下午都在社辦整理線索板，但簽到簿顯示他其實一直在隔壁倉庫幫忙搬展示櫃，說法完全對不上。',
      },
      {
        type: 'code',
        riddleEn: 'I am flat and hang on a wall. People pin notes and pictures on me. Detectives use me to organize their clues.',
        answer: 'BOARD',
        letterBank: ['B', 'O', 'A', 'R', 'D', 'S', 'T', 'E', 'N'],
        explainZh: '謎題描述「平平的、掛在牆上、人們會把筆記和圖片釘在我身上、偵探用我來整理線索」——答案是 board（板子），正是這次消失的榮譽線索板！',
        clueZh: '社辦角落發現了一個全新的木頭相框，大小剛好可以裝下整片線索板，旁邊還放著一張寫著「慶祝派對」的海報草稿。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '🕵️', name: '神秘快遞員', zh: '第一季案件的兇手，如今已改過自新' },
        { emoji: '🧑‍🏫', name: '林老師', zh: '偵探社的顧問' },
        { emoji: '👦', name: '阿柏', zh: '曾在校慶運動會案件出現的社員' },
        { emoji: '👧', name: '允熙', zh: '曾在美術教室案件出現的社員' },
      ],
      answer: 2,
      clueZh: '林老師整個下午都在規劃派對，從沒碰過線索板；簽到簿顯示神秘快遞員其實在隔壁倉庫幫忙，他的謊言只是想證明自己很上進；目擊者看到阿柏興奮地扛著包起來的大東西，還說著「這會是個驚喜」；社辦角落更藏著一個全新相框和派對海報草稿。所有線索都指向阿柏——他想把線索板裝進漂亮的新相框裡，當作對全體社員的驚喜，為第二季慶祝派對增添最特別的禮物！英語偵探社，兩季以來的所有案件，正式全部偵破，友情與智慧的冒險，仍在繼續！',
    },
  }
);
