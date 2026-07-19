/* ===== 偵探社進階案件 37-48「特別調查組」後半＋最終對決 =====
   12 cases continuing after detective3.js's cases 25-36. This is the hardest
   tier: 5-7 sentence reading passages, cross-checked time/place
   contradictions, and 6-8 letter code answers. Each case has exactly 8
   rooms covering all 6 room types (read/liar/code/witness plus the new
   timeline/alibi types), with 2 extra rooms of any type mixed in.
   Every case also carries `adv: true` and an `arcZh` line — a fragment of
   the season's running mystery about the phantom thief "午夜貓影"
   (Midnight Cat Shadow), revealed after the case's own (ordinary, human)
   culprit is caught. The arc pays off in the final two cases: case 47
   (sp_cat_alliance) rallies the town before the showdown, and case 48
   (sp_final_duel) reveals Midnight Cat Shadow as Luna, the former
   museum curator's gentle granddaughter, returning antiques swindled long
   ago by the disgraced "Gray Fox Auction House."

   New room-type shapes (in addition to read/liar/code/witness from
   detective.js's header comment):
   timeline: { type:'timeline', introZh, events:[4 shuffled-display
     sentences], order:[4-index true chronological permutation, never
     the identity [0,1,2,3]], explainZh, clueZh }
   alibi: { type:'alibi', factZh (a hard record/fact with time or place),
     suspects:[3 x {emoji,name,alibiEn}], a (index of the suspect whose
     alibi contradicts factZh), explainZh, clueZh }
*/

DETECTIVE_CASES.push(
  // ===== Case 37: 冰凍金庫 =====
  {
    id: 'sp_frozen_vault',
    title: '冰凍金庫',
    icon: '🧊',
    sceneZh: '鎮上歷史悠久的「極地博物館」地下金庫，展出著各種珍貴的極地古董，其中最耀眼的是一顆傳說中的古董鑽石胸針。今天早上管理員一開金庫的門，卻發現胸針消失了，只留下冰冷的空玻璃展示盒。四位昨晚都出入過金庫周邊的人，都有嫌疑，你能在展覽開幕前找回胸針嗎？',
    adv: true,
    arcZh: '小珊歸還胸針時，館方在金庫門縫下發現了一張畫著貓掌印的小卡片，卡片背面用娟秀的字跡寫著「物歸原主」四個字——似乎在小珊闖禍之前，金庫裡早就有「別人」造訪過了。',
    rooms: [
      {
        type: 'read',
        textEn: "Grandpa Chen has managed the Polar Museum vault for twenty-two years. Every night, he locks the vault at ten o'clock and keeps the only emergency key inside his coat pocket. Last night, he finished his rounds at ten fifteen and went straight to his small office to fill out the daily report. He fell asleep in his chair by eleven o'clock because he was very tired. His assistant found him still sleeping there at six o'clock this morning, and the emergency key was still safely inside his coat pocket.",
        question: 'Where was the emergency key last night?',
        options: ["Safely inside Grandpa Chen's coat pocket the whole time.", 'Hanging on a hook outside the vault door.', 'Lent to the cleaning lady for the night.'],
        a: 0,
        explainZh: '文章寫出 the emergency key was still safely inside his coat pocket，代表鑰匙全程都沒有離開他身上，可以排除老管理員的嫌疑，也證明沒有人能用鑰匙從外面打開金庫。',
        clueZh: '老管理員十一點就在辦公室睡著了，緊急鑰匙全程都在他口袋裡，可以排除他的嫌疑。',
      },
      {
        type: 'read',
        textEn: 'Ah-Dong is a part-time repair intern at the museum. Two nights ago, the freezer pipe behind the vault started leaking cold water into the hallway. Last night, his supervisor asked him to fix the pipe before the morning opening. He worked in the hallway outside the vault from eleven thirty until one o\'clock. He wrote every step in his repair logbook, and he never touched the vault door or the display case inside.',
        question: 'What was Ah-Dong doing outside the vault last night?',
        options: ['Fixing a leaking freezer pipe in the hallway.', 'Trying to open the vault door.', "Sketching the diamond brooch."],
        a: 0,
        explainZh: '文章清楚說明他整晚都在走廊修理漏水的水管，並且完整記錄在維修日誌裡，從沒碰過金庫門或展示盒，可以排除他的嫌疑。',
        clueZh: '阿凍那晚一直在走廊修理漏水的冷凍水管，完整記錄在維修日誌裡，可以排除他的嫌疑。',
      },
      {
        type: 'liar',
        factZh: '博物館規定，夜間寫生班的學生下課後必須在九點半前離開博物館，晚上九點半之後大門就會自動上鎖，寫生班的識別證只能開啟寫生教室，不能開啟金庫側門。',
        statements: [
          { speaker: '👧 小珊', textEn: 'I left right after the sketching class ended at nine o\'clock, just like everyone else.' },
          { speaker: '👦 阿凍', textEn: "I stayed in the hallway fixing the pipe until one o'clock, with my supervisor's permission." },
          { speaker: '👩 冰姨', textEn: "I finished cleaning and left at eleven o'clock, as always." },
        ],
        a: 0,
        explainZh: '感應器紀錄顯示小珊其實在午夜過後才被偵測到，她卻說九點下課就跟大家一起離開了，這和感應紀錄矛盾，證明她在說謊。',
        clueZh: '小珊聲稱九點下課就跟大家一起離開，但感應器卻在午夜之後偵測到動靜，她的說法完全對不上。',
      },
      {
        type: 'witness',
        descEn: 'This person wears a heavy tool belt covered in frost. He was standing next to the freezer pipes outside the vault around midnight. He kept checking his watch and looked worried about the broken pipe.',
        options: [
          { emoji: '👦', label: '阿凍' },
          { emoji: '👩', label: '冰姨' },
          { emoji: '👴', label: '老管理員' },
          { emoji: '👧', label: '小珊' },
        ],
        a: 0,
        explainZh: 'heavy tool belt covered in frost、standing next to the freezer pipes、worried about the pipe，這些細節都指向正在修水管的阿凍，跟他的維修日誌完全吻合。',
        clueZh: '有人看到一位繫著結霜工具腰帶的男生，半夜站在金庫外的冷凍水管旁，一直看錶，似乎很擔心水管故障的事。',
      },
      {
        type: 'witness',
        descEn: 'This person carries a sketchbook full of gem drawings. Her fingers were cold and red from staying near the freezer vent too long. She was seen kneeling close to the display case late at night.',
        options: [
          { emoji: '👦', label: '阿凍' },
          { emoji: '👩', label: '冰姨' },
          { emoji: '👴', label: '老管理員' },
          { emoji: '👧', label: '小珊' },
        ],
        a: 3,
        explainZh: 'sketchbook full of gem drawings、cold red fingers、kneeling close to the display case，正好描述深夜偷偷靠近展示盒的小珊。',
        clueZh: '有人看到一個帶著畫滿寶石素描本的女孩，因為靠冷氣孔太久指尖凍得發白，深夜跪在展示櫃前仔細端詳。',
      },
      {
        type: 'timeline',
        introZh: '請把當晚金庫附近發生的四個事件，依照實際發生的先後順序排好，找出胸針消失的關鍵空檔。',
        events: [
          'The vault\'s inside motion sensor detects movement near the display case.',
          'The sketching class ends and most students leave the building.',
          'Grandpa Chen finishes his final check and falls asleep in his office chair.',
          "Ah-Dong finishes fixing the freezer pipe and goes home.",
        ],
        order: [1, 2, 0, 3],
        explainZh: '依時間排列：九點下課大家離開、十一點老管理員巡邏後睡著、十二點半金庫內感應器偵測到動靜、凌晨一點阿凍修好水管回家——時間軸顯示，十二點半那次金庫內部的動靜，正是唯一沒人能解釋的空窗期。',
        clueZh: '排好時間軸後發現，下課到修完水管之間，只有十二點半那次「金庫內部感應器」的紀錄無法被任何人解釋，成為破案關鍵。',
      },
      {
        type: 'alibi',
        factZh: '金庫側門的感應門禁紀錄顯示，昨晚十二點十五分，小珊的寫生班識別證曾經感應進入金庫側門一次，門禁系統的紀錄無法事後修改或補登。',
        suspects: [
          { emoji: '👦', name: '阿凍', alibiEn: 'I was outside the vault fixing the freezer pipe in the hallway, and I never went inside the vault.' },
          { emoji: '👩', name: '冰姨', alibiEn: 'I finished cleaning the vault at eleven o\'clock and went home right after, long before midnight.' },
          { emoji: '👧', name: '小珊', alibiEn: 'I was standing outside in the hallway the whole night and never entered the vault at all.' },
        ],
        a: 2,
        explainZh: '門禁紀錄清楚顯示小珊的識別證在十二點十五分感應進入金庫側門，她卻說自己整晚都在走廊外面、從沒進去過金庫，這和門禁紀錄直接矛盾。',
        clueZh: '小珊聲稱自己從沒進入金庫，但側門的門禁紀錄卻顯示她的識別證在十二點十五分感應進入，說法完全對不上。',
      },
      {
        type: 'code',
        riddleEn: 'I am a hard, clear stone. People say I am "a girl\'s best friend." I sparkle brightly under any light, and I never melt, even in a freezer.',
        answer: 'DIAMOND',
        letterBank: ['D', 'I', 'A', 'M', 'O', 'N', 'D', 'S', 'T', 'R'],
        explainZh: '謎題描述「堅硬透明的石頭、人們說我是女孩最好的朋友、在任何光線下都閃閃發亮、放在冷凍庫裡也不會融化」——答案是 diamond（鑽石），正是這次消失的古董胸針上鑲的寶石！',
        clueZh: '展示盒的絨布內襯上，找到了幾滴融化的冰霜水痕，還有一小片畫紙的邊角，邊角上似乎留著鉛筆線條的痕跡。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿凍', zh: '金庫維修工讀生' },
        { emoji: '👩', name: '冰姨', zh: '極地展覽清潔阿姨' },
        { emoji: '👴', name: '老管理員', zh: '金庫鑰匙保管人' },
        { emoji: '👧', name: '小珊', zh: '夜間寫生班學生' },
      ],
      answer: 3,
      clueZh: '老管理員睡著時緊急鑰匙全程沒離身；阿凍的維修日誌證明他全程都在走廊修水管；冰姨十一點就離開了；小珊卻謊稱下課就跟大家一起走了，門禁紀錄卻顯示她十二點十五分掃卡進入金庫側門，時間軸也顯示十二點半那次動靜無人能解釋，展示盒裡更找到了她的畫紙碎片。所有線索都指向小珊——她太著迷鑽石胸針的光芒，深夜偷偷回來想仔細寫生，卻一時鬼迷心竅把胸針放進口袋想戴著感受看看，才發現自己闖了大禍。',
    },
  },

  // ===== Case 38: 夜之花園謎語 =====
  {
    id: 'sp_garden_riddle',
    title: '夜之花園謎語',
    icon: '🌙',
    sceneZh: '夜間花園祭典即將點燈遊行，但掛在入口最古老的一盞「傳家水晶提燈」卻不見了！沒有它，遊行隊伍就少了最重要的領頭燈。四位晚上都在花園裡活動的人，你能找出到底是誰拿走了提燈嗎？',
    adv: true,
    arcZh: '提燈歸還的隔天早上，園丁伯伯在花圃裡發現了一枚小小的銀鈴鐺，還聞到淡淡的茉莉花香——他直覺這絕不是詩詩留下的東西，反倒像是有「別人」也在同一個晚上，安靜地造訪過這座夜之花園。',
    rooms: [
      {
        type: 'read',
        textEn: "Ah-Guang works part-time at the Night Garden Festival. Every evening, he sets up the fairy lights along the main path before the festival opens. Last night, one string of lights broke at seven o'clock, so his supervisor asked him to fix it right away. He worked on the same spot near the entrance from seven until nine thirty, using extra bulbs from his toolbox. He never walked over to the lantern display near the fountain, and his supervisor checked on him twice during that time.",
        question: 'What was Ah-Guang doing from seven to nine thirty last night?',
        options: ['Fixing a broken string of fairy lights near the entrance.', 'Carrying the crystal lantern to the fountain.', 'Reciting poetry near the fountain.'],
        a: 0,
        explainZh: '文章清楚說明阿光整晚七點到九點半都在入口附近修理故障的燈串，主管還去查看了兩次，可以排除他的嫌疑。',
        clueZh: '阿光整晚七點到九點半都在入口附近修理故障的燈串，主管還查看了兩次，可以排除他的嫌疑。',
      },
      {
        type: 'liar',
        factZh: '詩詞比賽的後台簽到簿上，清楚記錄詩詩的報到時間是晚上八點四十五分，簽到欄位不能事後補簽。',
        statements: [
          { speaker: '👧 詩詩', textEn: 'I arrived backstage at eight o\'clock and stayed there until the contest started at nine.' },
          { speaker: '👦 阿光', textEn: 'I fixed the fairy lights near the entrance and never left that spot.' },
          { speaker: '👴 園丁伯伯', textEn: "I checked all the lanterns at eight o'clock, and everything was still there." },
        ],
        a: 0,
        explainZh: '簽到簿清楚記錄詩詩其實是八點四十五分才報到，她卻說自己八點就到了，跟紀錄整整差了四十五分鐘，證明她在說謊。',
        clueZh: '詩詩聲稱自己八點就報到了，但簽到簿卻顯示她八點四十五分才到，整整差了四十五分鐘。',
      },
      {
        type: 'liar',
        factZh: '提燈旁新裝的太陽能感應夜燈，只要有人經過就會自動亮起幾秒，紀錄顯示昨晚八點三十五分左右曾經亮起一次，而那段時間阿光和小茉都各自留在別處，行蹤都有人可以證明。',
        statements: [
          { speaker: '👧 詩詩', textEn: 'I stayed backstage practicing my poem the whole time and never once stepped outside.' },
          { speaker: '👦 阿光', textEn: 'I was still fixing the fairy lights near the entrance at that time.' },
          { speaker: '👧 小茉', textEn: 'I was inside the gift shop paying for cat food at that exact time.' },
        ],
        a: 0,
        explainZh: '感應夜燈在八點三十五分亮起，但阿光和小茉當時都在別處，只有詩詩無法交代自己的行蹤，她卻說自己整晚沒離開後台，說法明顯有問題。',
        clueZh: '詩詩聲稱自己整晚沒離開後台，但提燈旁的感應夜燈卻在八點三十五分亮起，而那段時間只有她的行蹤說不清楚。',
      },
      {
        type: 'witness',
        descEn: 'This person carries a small notebook full of poems. She was seen walking quickly away from the fountain area around eight forty, holding something wrapped in her scarf. She looked nervous and kept checking over her shoulder.',
        options: [
          { emoji: '👦', label: '阿光' },
          { emoji: '👧', label: '詩詩' },
          { emoji: '👴', label: '園丁伯伯' },
          { emoji: '👧', label: '小茉' },
        ],
        a: 1,
        explainZh: 'notebook full of poems、walking quickly away from the fountain、holding something wrapped in her scarf，這些細節正好描述詩詩。',
        clueZh: '有人看到一個帶著寫滿詩句筆記本的女孩，八點四十分左右行色匆匆地離開噴水池附近，圍巾裡包著什麼東西，還一直緊張地回頭張望。',
      },
      {
        type: 'timeline',
        introZh: '請把昨晚花園裡發生的四個事件，依照實際時間先後排好，抓出詩詩到底何時偷偷靠近了提燈展示區。',
        events: [
          'The poetry contest officially begins on the garden stage.',
          'The garden gardener checks every lantern and confirms the crystal lantern is still hanging at the entrance.',
          'Shishi finally signs in at the backstage check-in table.',
          'The sensor light near the lantern display flashes on as someone walks by.',
        ],
        order: [1, 3, 2, 0],
        explainZh: '依時間排列：八點園丁確認提燈還在→八點三十五分感應燈亮起，代表有人經過→八點四十五分詩詩才姍姍來遲地報到→九點比賽正式開始。這段四十五分鐘的空窗期，正好足夠讓詩詩偷偷拿走提燈。',
        clueZh: '排好時間軸後發現，園丁確認提燈還在之後、詩詩報到之前，有一段四十五分鐘的空窗期，感應燈剛好在這段時間亮起。',
      },
      {
        type: 'timeline',
        introZh: '請再把阿光和小茉昨晚的行蹤依照實際時間先後排好，確認除了詩詩以外，其他人的時間都兜得起來。',
        events: [
          'Xiao-Mo returns to the back fence and continues feeding the garden cats.',
          'Ah-Guang finishes fixing the fairy lights and walks to the front gate to rest.',
          'Ah-Guang starts repairing the broken fairy lights near the entrance.',
          'Xiao-Mo pays for cat food at the gift shop counter.',
        ],
        order: [2, 3, 0, 1],
        explainZh: '依序排列後可以看出，阿光七點開始修燈、小茉八點四十買貓罐頭、八點五十又回去餵貓、阿光一直忙到九點半才休息——兩人的時間軸完全連貫，沒有任何空檔可以拿走提燈。',
        clueZh: '阿光和小茉兩人的時間軸環環相扣、毫無空隙，進一步證明提燈失竊另有其人。',
      },
      {
        type: 'alibi',
        factZh: '花園後台的簽到簿上，清楚記錄詩詩的報到時間是晚上八點四十五分，比賽開始前的簽到欄位不能事後補簽或塗改。',
        suspects: [
          { emoji: '👦', name: '阿光', alibiEn: 'I was near the entrance fixing lights, and my supervisor can confirm my location the whole evening.' },
          { emoji: '👴', name: '園丁伯伯', alibiEn: "I finished my lantern check at eight o'clock and then went home for dinner." },
          { emoji: '👧', name: '詩詩', alibiEn: 'I signed in backstage at eight o\'clock, a full forty-five minutes before the contest began.' },
        ],
        a: 2,
        explainZh: '簽到簿記錄詩詩其實是八點四十五分才報到，她卻說自己八點就報到了，跟紀錄整整差了四十五分鐘，這段對不上的時間正是她偷偷去拿提燈的空檔。',
        clueZh: '詩詩聲稱自己八點就報到，但簽到簿卻顯示她八點四十五分才到，這段對不上的時間正是破案關鍵。',
      },
      {
        type: 'code',
        riddleEn: 'I am made of glass and metal. I glow softly at night without any batteries or wires. Long ago, people carried me to light up dark garden paths.',
        answer: 'LANTERN',
        letterBank: ['L', 'A', 'N', 'T', 'E', 'R', 'N', 'S', 'O', 'C'],
        explainZh: '謎題描述「玻璃和金屬做的、晚上會發出柔和的光、不需要電池或電線、以前的人用我照亮花園小路」——答案是 lantern（提燈），正是這次消失的傳家水晶提燈！',
        clueZh: '噴水池旁的長椅底下，發現一小截從圍巾上勾破的毛線，顏色和詩詩比賽當天圍的圍巾一模一樣。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿光', zh: '花園燈飾工讀生' },
        { emoji: '👧', name: '詩詩', zh: '參加詩詞比賽的學生' },
        { emoji: '👴', name: '園丁伯伯', zh: '花園管理員' },
        { emoji: '👧', name: '小茉', zh: '愛餵貓的鄰居女孩' },
      ],
      answer: 1,
      clueZh: '阿光整晚在修燈，有主管作證；園丁伯伯八點巡視後就回家吃飯；小茉的時間軸和買貓罐頭的收據完全吻合；詩詩卻兩度說謊——謊稱八點就報到、也謊稱從沒離開後台——簽到簿與感應燈紀錄都顯示她八點四十五分才出現，目擊者又看到她圍著圍巾行色匆匆離開噴水池，長椅下更找到她圍巾勾破的毛線。所有線索都指向詩詩——她太想在詩詞比賽上呈現「提著古董提燈朗誦」的畫面，一時心急借走了展示的提燈當道具，比賽結束後才驚覺闖了大禍，不敢承認。',
    },
  },

  // ===== Case 39: 蠟像館驚魂 =====
  {
    id: 'sp_wax_museum',
    title: '蠟像館驚魂',
    icon: '🕯️',
    sceneZh: '蠟像館新增了一座前任館長的蠟像，手裡握著一只從博物館庫房誤拿來當道具的珍貴古董懷錶。今天早上開館前，警衛發現懷錶不見了，蠟像手裡只剩一只廉價的塑膠仿製品，嚇得他直呼蠟像「活過來了」！四位昨晚都在館內活動過的人，你能找出真相嗎？',
    adv: true,
    arcZh: '蠟像館閉館後，管理員在懷錶原本擺放的展示台底下，發現了一枚小小的貓掌印卡片，卡片背面寫著一行娟秀的字：「這只是意外流入市面的古董，本來就該留在博物館。」看來早在小彥闖禍之前，「午夜貓影」就已經悄悄關注著這只懷錶的下落了。',
    rooms: [
      {
        type: 'read',
        textEn: "Wan-Ru is the museum's wax figure restorer. Two days ago, the former curator's wax figure had a loose finger joint in its right hand. Last night, her supervisor asked her to repair the joint before the exhibit reopens this weekend. She worked alone in the back workshop, three rooms away from the display hall, from seven o'clock until nine thirty. She glued and reset the tiny joint carefully under a bright lamp, and she never once carried any tools or props into the main display hall that night.",
        question: 'Where did Wan-Ru work last night?',
        options: ['Alone in the back workshop, away from the display hall.', 'In the main display hall next to the wax figure.', 'Outside the museum taking photographs.'],
        a: 0,
        explainZh: '文章清楚說明婉如整晚都在後方工作室修理蠟像手指關節，離展示大廳有三個房間之遠，可以排除她的嫌疑。',
        clueZh: '婉如整晚都在後方工作室修理蠟像手指關節，離展示大廳有三個房間之遠，可以排除她的嫌疑。',
      },
      {
        type: 'liar',
        factZh: '蠟像館的夜間警衛簽到表顯示，阿佑昨晚整晚都待在一樓大門的警衛室裡值班，中途只離開五分鐘去上廁所。',
        statements: [
          { speaker: '👦 阿佑', textEn: 'I patrolled every exhibit hall by myself three times last night.' },
          { speaker: '👵 咪咪奶奶', textEn: 'I only visited during opening hours in the afternoon and went home before dinner.' },
          { speaker: '👦 小彥', textEn: 'I was taking photos of the dinosaur exhibit the whole evening.' },
        ],
        a: 0,
        explainZh: '值班簽到表清楚記錄阿佑整晚幾乎都待在警衛室，只離開五分鐘，他卻說自己巡邏了三次全部展廳——其實他只是想讓自己聽起來更負責盡職，才誇大了說法，跟懷錶失竊無關。',
        clueZh: '阿佑聲稱自己整晚巡邏了三次，但值班簽到表顯示他幾乎都待在警衛室裡，他的話其實只是想邀功。',
      },
      {
        type: 'witness',
        descEn: 'This person carries a large camera bag with extra lighting equipment. He was seen adjusting a small lamp very close to the wax figure\'s display case around nine o\'clock. He looked completely focused on getting a perfect close-up shot.',
        options: [
          { emoji: '👦', label: '阿佑' },
          { emoji: '👩', label: '婉如' },
          { emoji: '👵', label: '咪咪奶奶' },
          { emoji: '👦', label: '小彥' },
        ],
        a: 3,
        explainZh: 'large camera bag、extra lighting equipment、adjusting a lamp close to the display case，這些細節都指向拿著相機的攝影社學生小彥。',
        clueZh: '有人看到一個背著大相機包、還帶了額外打光燈的男生，九點左右在蠟像展示櫃旁調整燈光，看起來一心想拍出完美的特寫照片。',
      },
      {
        type: 'timeline',
        introZh: '請把昨晚展示大廳附近發生的四個事件，依照實際時間先後排好，找出懷錶消失的關鍵空檔。',
        events: [
          'The motion sensor alarm briefly goes off near the display case.',
          'The night guard finishes his bathroom break and returns to the guard post.',
          'The wax museum closes to visitors and the lights dim for the night.',
          "Xiao-Yan sets up his camera and lighting equipment near the curator's wax figure.",
        ],
        order: [2, 3, 0, 1],
        explainZh: '依時間排列：六點閉館、八點四十五分小彥架好相機和燈具、九點十分感應警報器突然響起、九點十五分警衛才回到崗位——警報響起時，唯一在展示櫃旁邊的人，就是正在拍照的小彥。',
        clueZh: '時間軸顯示警報響起的九點十分，警衛還在洗手間，只有小彥一人在展示櫃附近，這段時間成為破案關鍵。',
      },
      {
        type: 'alibi',
        factZh: '展示大廳的感應警報器紀錄顯示，昨晚九點十分那次警報，是由「大廳中央」的感應器觸發，而不是門口或後方工作室的感應器。',
        suspects: [
          { emoji: '👦', name: '阿佑', alibiEn: 'I was in the guard room the whole time except for a short bathroom break before nine.' },
          { emoji: '👩', name: '婉如', alibiEn: 'I was in the back workshop the entire evening and never went near the display hall.' },
          { emoji: '👦', name: '小彥', alibiEn: 'I was outside the museum photographing the front garden at nine o\'clock and nowhere near the display hall.' },
        ],
        a: 2,
        explainZh: '感應警報器顯示九點十分觸發的是「大廳中央」感應器，小彥卻說自己九點時人在館外拍花園，跟目擊者和時間軸的紀錄完全對不上，證明他在說謊。',
        clueZh: '小彥聲稱自己九點時在館外拍花園，但警報器紀錄卻顯示大廳中央那時觸發了感應器，說法完全對不上。',
      },
      {
        type: 'alibi',
        factZh: '大門的訪客卡感應器記錄顯示，咪咪奶奶其實在晚上七點時又短暫刷卡入館一次，停留不到十分鐘就離開了，感應紀錄無法事後修改。',
        suspects: [
          { emoji: '👵', name: '咪咪奶奶', alibiEn: 'I visited in the afternoon and went straight home for dinner before the museum closed, and I never came back.' },
          { emoji: '👦', name: '阿佑', alibiEn: 'I was on duty at the guard post all evening except for a short break.' },
          { emoji: '👩', name: '婉如', alibiEn: "I was repairing the wax figure's finger joint in the back workshop the whole evening." },
        ],
        a: 0,
        explainZh: '訪客卡感應器記錄顯示咪咪奶奶晚上七點確實又短暫回到博物館一次，她卻說回家後就再也沒回來——後來發現，她只是想偷偷放一張老照片在前任館長的紀念角落，跟懷錶失竊完全無關，是個溫馨的誤會。',
        clueZh: '咪咪奶奶聲稱回家後就沒再回來，但訪客卡感應器卻顯示她晚上七點又短暫回館一次，說法看似矛盾，其實只是個溫馨的誤會。',
      },
      {
        type: 'code',
        riddleEn: 'I am a word for something very old and valuable. Museums love to display me because I tell a story from the past. I am not new, but people treasure me even more because of my age.',
        answer: 'ANTIQUE',
        letterBank: ['A', 'N', 'T', 'I', 'Q', 'U', 'E', 'S', 'O', 'R'],
        explainZh: '謎題描述「形容非常古老又珍貴的東西、博物館喜歡展示我因為我訴說著過去的故事、我不新，但人們因為我的年代而更珍惜我」——答案是 antique（古董），正是這只從庫房誤入展示櫃的懷錶！',
        clueZh: '蠟像手中原本握著的懷錶不見了，取而代之的是一個廉價的塑膠仿製品，仿製品背後還貼著一小張寫著「暫時商借，稍後歸還」的便條紙。',
      },
      {
        type: 'code',
        riddleEn: 'I am a small room or cabinet. People use me to store things out of sight. If you are hiding something in a hurry, you might put it inside me.',
        answer: 'CLOSET',
        letterBank: ['C', 'L', 'O', 'S', 'E', 'T', 'A', 'N', 'R'],
        explainZh: '謎題描述「小小的房間或櫃子、人們用我把東西藏起來、如果你急著藏東西，可能會把它放進我裡面」——答案是 closet（儲藏室），正是懷錶最後被藏起來的地方！',
        clueZh: '儲藏室的門把上，發現了一小片相機背帶的皮革碎屑，跟小彥背包上磨損的背帶顏色相同。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿佑', zh: '蠟像館夜間警衛實習生' },
        { emoji: '👩', name: '婉如', zh: '蠟像修復師' },
        { emoji: '👵', name: '咪咪奶奶', zh: '前任館長的老朋友' },
        { emoji: '👦', name: '小彥', zh: '攝影社學生' },
      ],
      answer: 3,
      clueZh: '婉如整晚在工作室修蠟像手指，離展示廳很遠；阿佑的謊言只是想邀功，他其實全程在警衛室；咪咪奶奶晚上確實短暫回來過，但只是為了放一張紀念照片，與失竊無關；小彥卻謊稱自己在館外拍花園，警報器紀錄和目擊者、時間軸都顯示九點十分他就在展示大廳中央的蠟像旁，儲藏室門把上還找到跟他相機背帶相同的皮革碎屑。所有線索都指向小彥——他發現懷錶被誤放進展示櫃當道具，捨不得錯過拍下懷錶精緻雕花的機會，就偷偷借去別的房間拍照，結果警報器一響把他嚇得手忙腳亂，慌張之下把懷錶藏進儲藏室，用假錶充數想矇混過關。',
    },
  },

  // ===== Case 40: 夜間動物園 =====
  {
    id: 'sp_night_zoo',
    title: '夜間動物園',
    icon: '🦉',
    sceneZh: '動物園「夜行動物館」展出創辦人當年巡夜用的古董黃銅羅盤，今天早上職員巡邏時卻發現展示櫃是空的！昨晚正好有一團學生在動物園旁的草地夜宿露營，四位晚上都在園區活動的人，你能找出到底是誰拿走了羅盤嗎？',
    adv: true,
    arcZh: '隔天巡邏員在小宇爬過的踏腳台旁，發現了一枚小小的銀鈴鐺，還聞到一絲若有似無的茉莉花香——他心想，這座動物園深夜似乎不只小宇一個「不速之客」。',
    rooms: [
      {
        type: 'read',
        textEn: "The owl show host has worked at the zoo for six years. Every evening, she hosts a live owl show for visitors from seven thirty until nine o'clock. Last night, more than thirty guests watched her show under bright stage lights the whole time. After the show ended, she spent thirty minutes cleaning her station and put away all her equipment. She left the zoo at nine thirty and drove straight home.",
        question: 'What did the owl show host do after her show ended?',
        options: ['She cleaned her station and then went home.', 'She walked to the compass display case.', 'She joined the overnight camping group.'],
        a: 0,
        explainZh: '文章清楚寫出表演結束後她花三十分鐘整理器材，接著就開車回家了，加上表演全程有三十多位遊客在場作證，可以排除她的嫌疑。',
        clueZh: '貓頭鷹姐姐的表演全程有三十多位遊客見證，結束後又直接整理器材回家，可以排除她的嫌疑。',
      },
      {
        type: 'liar',
        factZh: '黑豹保育員的健康檢查紀錄簿顯示，他昨晚為黑豹「小黑」做例行健康檢查，一路忙到晚上十一點才簽名結束，紀錄上還附有時間戳記。',
        statements: [
          { speaker: '👨 黑豹保育員', textEn: 'I finished the check-up at seven o\'clock and went straight home for dinner.' },
          { speaker: '👦 阿峰', textEn: 'I led the night tour group until nine thirty, then went to the staff room.' },
          { speaker: '👦 小宇', textEn: 'I stayed in my tent the whole night with my camp group.' },
        ],
        a: 0,
        explainZh: '健康檢查紀錄簿清楚顯示保育員忙到晚上十一點才結束，他卻說七點就回家了——其實他只是不好意思讓大家知道檢查花了那麼久，跟羅盤失竊無關。',
        clueZh: '黑豹保育員聲稱七點就回家了，但健康檢查紀錄簿卻顯示他忙到十一點才簽名結束，說法對不上。',
      },
      {
        type: 'liar',
        factZh: '夜宿露營的帳篷點名表顯示，輔導員在半夜十二點巡查帳篷時，發現小宇的睡袋是空的，他人不在帳篷裡。',
        statements: [
          { speaker: '👦 小宇', textEn: 'I was sleeping in my tent all night and never left the camping area.' },
          { speaker: '👦 阿峰', textEn: "I helped close up the nocturnal house at ten o'clock and then went to the staff room." },
          { speaker: '👨 黑豹保育員', textEn: 'I was in the vet station finishing paperwork until eleven o\'clock.' },
        ],
        a: 0,
        explainZh: '帳篷點名表顯示半夜十二點小宇的睡袋是空的，他卻說自己整晚都在帳篷裡，這和點名紀錄直接矛盾，證明他在說謊。',
        clueZh: '小宇聲稱自己整晚都在帳篷裡，但點名表卻顯示半夜十二點他的睡袋是空的，說法完全對不上。',
      },
      {
        type: 'witness',
        descEn: 'This person carries a small flashlight and wears a scout badge on his jacket. He was seen standing at the compass display case around midnight, moving his hand in a slow circle as if he were checking direction.',
        options: [
          { emoji: '👦', label: '阿峰' },
          { emoji: '👩', label: '貓頭鷹姐姐' },
          { emoji: '👨', label: '黑豹保育員' },
          { emoji: '👦', label: '小宇' },
        ],
        a: 3,
        explainZh: 'small flashlight、scout badge、standing at the compass case moving his hand like checking direction，這些細節都指向愛探險的小宇。',
        clueZh: '有人看到一個帶著小手電筒、外套上別著童軍徽章的男生，半夜站在羅盤展示櫃前，手還慢慢畫著圈，像是在確認方向。',
      },
      {
        type: 'witness',
        descEn: 'This person wears a staff vest with a keyring on his belt. He was seen locking every door of the nocturnal house carefully at ten o\'clock, checking each lock twice before walking away.',
        options: [
          { emoji: '👦', label: '阿峰' },
          { emoji: '👩', label: '貓頭鷹姐姐' },
          { emoji: '👨', label: '黑豹保育員' },
          { emoji: '👦', label: '小宇' },
        ],
        a: 0,
        explainZh: 'staff vest、keyring、locking every door carefully at ten o\'clock，這正是負責關園的阿峰認真盡責的表現，與他自己的說法完全吻合。',
        clueZh: '有人看到一位繫著鑰匙圈的工作人員，十點時仔細鎖上夜行動物館每一扇門，還檢查了兩次才離開。',
      },
      {
        type: 'timeline',
        introZh: '請把昨晚夜行動物館附近發生的四個事件，依照實際時間先後排好，找出羅盤消失的關鍵空檔。',
        events: [
          'A staff member notices the compass display case is empty during a routine check.',
          'The owl show host finishes cleaning her station and drives home.',
          "A camp counselor discovers Xiao-Yu's sleeping bag is empty during a tent check.",
          'Ah-Feng locks every door of the nocturnal house and walks away.',
        ],
        order: [1, 3, 2, 0],
        explainZh: '依時間排列：九點半貓頭鷹姐姐整理完離開、十點阿峰鎖上所有門、十二點輔導員發現小宇不在帳篷、十二點半職員發現羅盤展示櫃是空的——小宇消失的時間，正好和羅盤消失的時間緊緊相連。',
        clueZh: '時間軸顯示，小宇半夜十二點就已經不在帳篷裡，半小時後羅盤展示櫃就被發現是空的，兩個時間點緊緊相扣。',
      },
      {
        type: 'alibi',
        factZh: '巡邏紀錄簿顯示，凌晨十二點十分，巡邏員在夜行動物館後方的窗戶下，發現了一個用帆布搭起的簡易踏腳台，高度只適合身高不到一百五十公分的孩童攀爬。',
        suspects: [
          { emoji: '👦', name: '阿峰', alibiEn: "I am much too tall to fit through that low window, and I was locking the front doors at ten o'clock anyway." },
          { emoji: '👨', name: '黑豹保育員', alibiEn: 'I was in the vet station the whole night with health-check paperwork to prove it.' },
          { emoji: '👦', name: '小宇', alibiEn: 'I never went near the back window of the nocturnal house at all last night.' },
        ],
        a: 2,
        explainZh: '巡邏紀錄顯示踏腳台的高度只適合矮小的孩童，小宇卻說自己根本沒去過那扇窗，這和他的身高、還有帳篷檢查發現他半夜不在睡袋裡的事實矛盾。',
        clueZh: '小宇聲稱自己從沒去過後方窗戶，但踏腳台的高度剛好適合矮小的孩童，加上他半夜確實不在帳篷裡，說法完全對不上。',
      },
      {
        type: 'code',
        riddleEn: 'I have a needle that always points north. Explorers and sailors use me to find their way in the dark. I do not need batteries or a screen.',
        answer: 'COMPASS',
        letterBank: ['C', 'O', 'M', 'P', 'A', 'S', 'S', 'T', 'E', 'N'],
        explainZh: '謎題描述「有一根永遠指向北方的指針、探險家和水手用我在黑暗中找路、不需要電池或螢幕」——答案是 compass（羅盤），正是這次消失的古董黃銅羅盤！',
        clueZh: '踏腳台旁的草地上，發現了一枚沾著露水的童軍徽章，還有一小截磨損的手電筒背帶。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👦', name: '阿峰', zh: '夜間動物園導覽實習生' },
        { emoji: '👩', name: '貓頭鷹姐姐', zh: '夜行動物解說員' },
        { emoji: '👨', name: '黑豹保育員', zh: '負責黑豹健康檢查' },
        { emoji: '👦', name: '小宇', zh: '愛探險的夜宿營男孩' },
      ],
      answer: 3,
      clueZh: '貓頭鷹姐姐全程有遊客見證；阿峰十點就仔細鎖好所有門離開；黑豹保育員的謊言只是不好意思說自己忙到很晚，跟案件無關；小宇卻謊稱整晚都在帳篷裡，點名表顯示他半夜十二點就不見了，踏腳台的高度也剛好適合他攀爬，草地上還找到他的童軍徽章和手電筒背帶。所有線索都指向小宇——他太想在夜宿營玩「小小探險家」的遊戲，偷偷拿走羅盤想證明自己能在黑暗中找到路，結果玩到忘記時間，嚇壞了輔導員。',
    },
  },

  // ===== Case 41: 星空列車 =====
  {
    id: 'sp_star_train',
    title: '星空列車',
    icon: '🚂',
    sceneZh: '開往山谷觀星區的「星空列車」貴賓車廂裡，一位銀髮的退休天文學家爺爺隨身攜帶的古董星形吊墜盒不見了——裡面裝著他已故妻子當年親手畫的手繪星圖。列車即將抵達觀星地點，你能在星星升起前找回吊墜盒嗎？',
    adv: true,
    arcZh: '吊墜盒歸還當晚，列車長在貴賓車廂的窗台上，發現了一張畫著貓掌印的小卡片，還有一絲淡淡的茉莉花香——他心想，這班列車今晚載的乘客，恐怕不只車票上登記的那幾位。',
    rooms: [
      {
        type: 'read',
        textEn: "The junior train attendant serves dinner in the dining car every evening. Last night, he took orders and carried dishes for over twenty guests from seven o'clock until nine o'clock without a single break. His supervisor checked on him three times during the dinner service. He never left the dining car, and he did not enter the VIP cabin at any point during the evening.",
        question: 'What did the junior attendant do from seven to nine o\'clock?',
        options: ['He served dinner to guests in the dining car.', 'He visited the VIP cabin to look at the locket.', 'He rested alone in his own cabin.'],
        a: 0,
        explainZh: '文章清楚說明他整段時間都在餐車服務二十多位客人，主管還查看了三次，從沒進過貴賓車廂，可以排除他的嫌疑。',
        clueZh: '小侍者整晚都在餐車服務客人，主管查看了三次，從沒進過貴賓車廂，可以排除他的嫌疑。',
      },
      {
        type: 'liar',
        factZh: '餐車的訂位紀錄顯示，阿祈昨晚八點十五分到八點五十分，獨自一人訂了餐車靠窗、燈光最亮的座位。',
        statements: [
          { speaker: '👨‍🦱 阿祈', textEn: 'I was resting alone in my own sleeper cabin the entire evening.' },
          { speaker: '👧 天文社學生', textEn: 'I was chatting with my classmates in the group carriage until nine o\'clock.' },
          { speaker: '👨‍✈️ 列車長', textEn: 'I stayed in the control cabin steering the train the whole evening.' },
        ],
        a: 0,
        explainZh: '餐車訂位紀錄顯示阿祈八點十五分到八點五十分訂了燈光最亮的靠窗座位，他卻說自己整晚都在自己的臥鋪車廂休息，說法和訂位紀錄矛盾，證明他在說謊。',
        clueZh: '阿祈聲稱自己整晚都在臥鋪車廂休息，但餐車訂位紀錄卻顯示他八點十五分訂了靠窗最亮的座位，說法完全對不上。',
      },
      {
        type: 'witness',
        descEn: 'This person wears a camera around his neck and sits alone at a brightly lit window table. He was holding something small, shiny, and star-shaped close to the light, muttering excitedly about a comet.',
        options: [
          { emoji: '👨‍✈️', label: '列車長' },
          { emoji: '👦', label: '小侍者' },
          { emoji: '👧', label: '天文社學生' },
          { emoji: '👨‍🦱', label: '阿祈' },
        ],
        a: 3,
        explainZh: 'camera around his neck、sitting alone at the brightest window table、holding something small star-shaped、muttering about a comet，全都指向著迷天文攝影的阿祈。',
        clueZh: '有人看到一個脖子掛著相機的男子，獨自坐在燈光最亮的靠窗座位，手裡拿著小小發亮的星形物品湊近燈光，還興奮地喃喃自語說著彗星的事。',
      },
      {
        type: 'timeline',
        introZh: '請把昨晚貴賓車廂附近發生的四個事件，依照實際時間先後排好，找出吊墜盒消失的關鍵空檔。',
        events: [
          'A staff member discovers the locket display case in the VIP cabin is empty.',
          'The astronomer grandfather falls asleep in his VIP cabin seat.',
          'Ah-Qi reserves the brightest window table in the dining car.',
          'The train enters a long dark tunnel before the stargazing valley.',
        ],
        order: [1, 2, 3, 0],
        explainZh: '依時間排列：七點半天文學家爺爺在座位上睡著、八點十五分阿祈訂下最亮的窗邊座位、八點五十分列車進入長長的隧道、九點十分職員發現吊墜盒展示盒是空的——爺爺睡著後的空檔，正好被阿祈拿去研究吊墜盒了。',
        clueZh: '時間軸顯示，爺爺睡著之後、隧道之前，阿祈一直獨自坐在最亮的窗邊座位，這段時間成為破案關鍵。',
      },
      {
        type: 'timeline',
        introZh: '請再把列車長、小侍者、天文社學生三人昨晚的行蹤依照實際時間先後排好，確認他們的時間都兜得起來。',
        events: [
          'The junior attendant finishes serving dinner and cleans the dining car.',
          'The conductor begins his evening shift in the control cabin.',
          'The astronomy club student joins her classmates in the group carriage.',
          'The conductor safely guides the train through the mountain curve.',
        ],
        order: [1, 2, 0, 3],
        explainZh: '依序排列後可以看出，列車長七點開始值班、天文社學生七點半加入同學、小侍者九點才整理完餐車、列車長接著安全帶著列車通過山彎——三人的時間軸環環相扣，沒有空檔可以拿走吊墜盒。',
        clueZh: '列車長、小侍者、天文社學生三人的時間軸完全連貫，進一步證明吊墜盒失竊另有其人。',
      },
      {
        type: 'alibi',
        factZh: '餐車服務生手寫的座位紀錄本上，清楚寫著阿祈晚上八點十五分到八點五十分獨自坐在靠窗最亮的座位，紀錄本上的字跡和時間都無法事後更改。',
        suspects: [
          { emoji: '👨‍✈️', name: '列車長', alibiEn: 'I stayed in the control cabin the entire evening, and the train\'s black box can confirm it.' },
          { emoji: '👧', name: '天文社學生', alibiEn: 'I was with my classmates in the group carriage the whole time, and they can all confirm it.' },
          { emoji: '👨‍🦱', name: '阿祈', alibiEn: 'I was resting alone in my sleeper cabin from eight o\'clock until nine.' },
        ],
        a: 2,
        explainZh: '餐車座位紀錄本清楚寫著阿祈八點十五分到八點五十分坐在靠窗座位，他卻說自己整段時間都在臥鋪車廂休息，這和紀錄本直接矛盾，證明他在說謊。',
        clueZh: '阿祈聲稱自己整段時間都在臥鋪車廂休息，但餐車座位紀錄本卻顯示他當時坐在靠窗座位，說法完全對不上。',
      },
      {
        type: 'alibi',
        factZh: '貴賓車廂的乘務紀錄顯示，天文社學生曾在晚上七點四十分短暫進入爺爺的座位區，停留不到兩分鐘。',
        suspects: [
          { emoji: '👧', name: '天文社學生', alibiEn: 'I only stopped by to give Grandpa a warm blanket because the cabin was getting cold, then I went right back to my seat.' },
          { emoji: '👨‍✈️', name: '列車長', alibiEn: 'I stayed in the control cabin the entire evening and never visited the VIP cabin.' },
          { emoji: '👦', name: '小侍者', alibiEn: 'I was serving dinner in the dining car and never entered the VIP cabin.' },
        ],
        a: 0,
        explainZh: '乘務紀錄顯示天文社學生確實短暫進入過爺爺的座位區，看似可疑，但她的說法其實與紀錄一致——她只是想拿條毯子給怕冷的爺爺，是個溫馨的小舉動，與吊墜盒失竊無關。',
        clueZh: '天文社學生確實短暫靠近過爺爺的座位，但她只是想拿毯子給怕冷的爺爺，是個溫馨的誤會。',
      },
      {
        type: 'code',
        riddleEn: 'I am small and often shaped like a heart or a star. I open up to hold a tiny picture or drawing inside. People wear me on a chain around their neck.',
        answer: 'LOCKET',
        letterBank: ['L', 'O', 'C', 'K', 'E', 'T', 'A', 'N', 'S'],
        explainZh: '謎題描述「小小的、常常是心形或星形、打開後可以裝一張小照片或圖畫、人們用鍊子掛在脖子上」——答案是 locket（吊墜盒），正是爺爺隨身攜帶的那個星形吊墜盒！',
        clueZh: '餐車靠窗座位的桌角，發現了一小片畫著星星圖案的薄紙碎片，跟爺爺吊墜盒裡的手繪星圖紙質一模一樣。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👨‍✈️', name: '列車長', zh: '負責駕駛列車' },
        { emoji: '👦', name: '小侍者', zh: '餐車實習服務生' },
        { emoji: '👧', name: '天文社學生', zh: '隨團旅遊的學生' },
        { emoji: '👨‍🦱', name: '阿祈', zh: '熱愛星空攝影的旅客' },
      ],
      answer: 3,
      clueZh: '小侍者整晚在餐車服務客人；列車長整晚在控制車廂，有黑盒紀錄作證；天文社學生只是好心送毯子給爺爺，與案件無關；阿祈卻謊稱自己在臥鋪休息，餐車訂位紀錄和目擊者都顯示他當時坐在最亮的窗邊座位，時間軸更顯示吊墜盒消失的空檔正好是他獨自坐在那裡的時間，桌角還找到跟星圖紙質相同的碎片。所有線索都指向阿祈——他發現吊墜盒裡的星圖竟然畫著他研究多年的稀有彗星路徑，太興奮忍不住借去明亮處拍照存證，卻因為連日守夜觀星太累，拍完後自己也不小心睡著，忘了把吊墜盒送回去。',
    },
  },

  // ===== Case 42: 幽靈船傳說 =====
  {
    id: 'sp_phantom_ship',
    title: '幽靈船傳說',
    icon: '⛵',
    sceneZh: '觀光「幽靈船」主題遊船上，展示著一枚據說能保佑水手平安的古董黃銅錨形吊飾。今晚說書阿伯才剛講完最恐怖的幽靈船傳說，隔天一早船長就發現展示櫃裡的錨形吊飾不見了！難道傳說是真的嗎？',
    adv: true,
    arcZh: '吊飾找回的那晚，老船長在船舷邊發現了一枚細細的銀色鈴鐺，還有一絲淡淡的茉莉花香隨海風飄來——他忍不住想，這片海域上，或許真的還有另一位「訪客」。',
    rooms: [
      {
        type: 'read',
        textEn: "The old captain has steered this tour ship for fifteen years. Every night, he must stay at the ship's wheel to keep the boat steady through the rocky channel. Last night, he stood at the wheel from eight o'clock until midnight without stepping away, because the fog made the water especially dangerous to navigate. Two crew members can confirm they saw him there the whole time.",
        question: 'Where was the old captain from eight o\'clock until midnight?',
        options: ["Standing at the ship's wheel the whole time.", 'Telling ghost stories in the saloon.', 'Climbing to the crow\'s nest.'],
        a: 0,
        explainZh: '文章清楚說明船長整晚都站在船舵前，因為濃霧讓航道特別危險，兩位船員也能作證，可以排除他的嫌疑。',
        clueZh: '老船長整晚都站在船舵前掌舵，兩位船員能作證，可以排除他的嫌疑。',
      },
      {
        type: 'read',
        textEn: 'The storyteller has hosted the ghost ship legend show for eight years. Last night, more than twenty guests gathered in the saloon to hear his stories. He began the show at eight thirty and finished at ten o\'clock. Guests clapped and asked questions the whole time, and he never once left the small stage at the front of the saloon.',
        question: 'What did the storyteller do from eight thirty to ten o\'clock?',
        options: ['He told ghost stories on the saloon stage.', 'He climbed to the crow\'s nest.', 'He went to buy souvenirs.'],
        a: 0,
        explainZh: '文章清楚說明說書阿伯整段時間都在沙龍舞台上講故事，二十多位客人全程見證，可以排除他的嫌疑。',
        clueZh: '說書阿伯整段時間都在沙龍舞台上講故事，二十多位客人全程見證，可以排除他的嫌疑。',
      },
      {
        type: 'liar',
        factZh: '船上紀念品店的收據紀錄顯示，觀光客小妹昨晚九點到九點半之間，在下層甲板的紀念品店買了三個奇怪的紀念品。',
        statements: [
          { speaker: '👧 觀光客小妹', textEn: 'I stayed in my cabin resting the whole evening and never went to the gift shop.' },
          { speaker: '👴 說書阿伯', textEn: 'I was telling stories on the saloon stage the whole evening.' },
          { speaker: '👦 小水手', textEn: 'I was doing my chores on the lower deck all evening.' },
        ],
        a: 0,
        explainZh: '紀念品店的收據紀錄顯示小妹九點到九點半確實在店裡買東西，她卻說自己整晚都在船艙休息——其實她只是不好意思讓大家知道自己愛買奇怪的紀念品，跟吊飾失竊無關。',
        clueZh: '觀光客小妹聲稱整晚都在船艙休息，但紀念品店的收據卻顯示她九點多有去買東西，說法看似矛盾，其實只是個小小的害羞。',
      },
      {
        type: 'witness',
        descEn: 'This person was seen climbing the rope ladder toward the crow\'s nest around eleven thirty at night. He clutched something small and metal tightly in one hand and kept glancing nervously into the fog.',
        options: [
          { emoji: '👨‍✈️', label: '老船長' },
          { emoji: '👴', label: '說書阿伯' },
          { emoji: '👦', label: '小水手' },
          { emoji: '👧', label: '觀光客小妹' },
        ],
        a: 2,
        explainZh: 'climbing toward the crow\'s nest、clutching something small and metal、glancing nervously into the fog，這些細節都指向膽小又好奇的小水手。',
        clueZh: '有人看到一個男生半夜十一點半左右，爬著繩梯往瞭望台的方向去，手裡緊緊抓著小小的金屬物品，還一直緊張地望向濃霧。',
      },
      {
        type: 'timeline',
        introZh: '請把昨晚船上發生的四個事件，依照實際時間先後排好，找出吊飾消失的關鍵時刻。',
        events: [
          'The old captain begins his long watch at the ship\'s wheel.',
          'A crew member discovers the anchor charm display case is empty.',
          'The storyteller finishes his ghost ship legend show in the saloon.',
          'The young sailor climbs the rope ladder toward the crow\'s nest.',
        ],
        order: [0, 2, 3, 1],
        explainZh: '依時間排列：八點船長開始長時間掌舵、十點說書阿伯結束故事秀、十一點半小水手爬向瞭望台、午夜職員發現展示櫃是空的——小水手爬向瞭望台後不久，吊飾就消失了。',
        clueZh: '時間軸顯示，小水手爬向瞭望台之後，吊飾展示櫃很快就被發現是空的，兩件事緊緊相連。',
      },
      {
        type: 'alibi',
        factZh: '瞭望台的安全簽到本規定，任何船員爬上瞭望台前都必須簽名，紀錄顯示小水手昨晚十一點四十分獨自簽名爬上了瞭望台。',
        suspects: [
          { emoji: '👨‍✈️', name: '老船長', alibiEn: 'I was at the wheel the whole night and never once left my post to climb anywhere.' },
          { emoji: '👴', name: '說書阿伯', alibiEn: 'I was on the saloon stage telling stories until ten o\'clock, and everyone saw me there.' },
          { emoji: '👦', name: '小水手', alibiEn: 'I stayed on the lower deck doing my chores all night and never climbed to the crow\'s nest.' },
        ],
        a: 2,
        explainZh: '瞭望台的安全簽到本清楚記錄小水手昨晚十一點四十分簽名爬上了瞭望台，他卻說自己整晚都在下層甲板做家務，這和簽到本直接矛盾，證明他在說謊。',
        clueZh: '小水手聲稱自己整晚都在下層甲板，但瞭望台的安全簽到本卻顯示他十一點四十分簽名爬了上去，說法完全對不上。',
      },
      {
        type: 'code',
        riddleEn: 'I am made of heavy metal shaped like a hook. Sailors drop me into the water to keep their ship from drifting away. Old sailors believe I bring good luck.',
        answer: 'ANCHOR',
        letterBank: ['A', 'N', 'C', 'H', 'O', 'R', 'S', 'T', 'E'],
        explainZh: '謎題描述「用沉重金屬做成鉤子形狀、水手把我丟進水裡讓船不會漂走、老水手相信我會帶來好運」——答案是 anchor（船錨），正是這次消失的錨形吊飾！',
        clueZh: '瞭望台的木板縫隙裡，卡著一小截磨損的繩梯纖維，還沾著一點黃銅吊飾特有的金屬光澤。',
      },
      {
        type: 'code',
        riddleEn: 'I am a very loud, deep sound made by a ship\'s horn. I warn other boats when the fog is thick and no one can see very far. Sailors listen for me to stay safe.',
        answer: 'FOGHORN',
        letterBank: ['F', 'O', 'G', 'H', 'O', 'R', 'N', 'S', 'A', 'T'],
        explainZh: '謎題描述「船隻發出的響亮低沉聲音、濃霧太厚看不清楚時用來警告其他船隻、水手靠我保持安全」——答案是 foghorn（霧笛），昨晚響亮的霧笛聲正好蓋過了小水手爬繩梯的聲音！',
        clueZh: '值班日誌上記著，昨晚十一點半霧笛連續響了好幾聲，聲音太大，蓋過了瞭望台附近所有的細微聲響。',
      },
    ],
    culprit: {
      suspects: [
        { emoji: '👨‍✈️', name: '老船長', zh: '掌舵十五年的船長' },
        { emoji: '👴', name: '說書阿伯', zh: '講幽靈船傳說的導覽員' },
        { emoji: '👦', name: '小水手', zh: '膽小又好奇的實習水手' },
        { emoji: '👧', name: '觀光客小妹', zh: '愛收集奇怪紀念品的旅客' },
      ],
      answer: 2,
      clueZh: '老船長整晚在掌舵，兩位船員作證；說書阿伯整晚在舞台上講故事，二十多位客人見證；觀光客小妹的謊言只是害羞不敢承認自己愛買紀念品，與案件無關；小水手卻謊稱整晚都在下層甲板，瞭望台簽到本卻顯示他十一點四十分簽名爬了上去，目擊者也看到他抓著金屬物品爬繩梯，時間軸更顯示吊飾消失的時間點正好緊接在他爬上瞭望台之後。所有線索都指向小水手——他太害怕又太好奇幽靈船的傳說是不是真的，偷偷把吊飾帶到瞭望台想試試看能不能感應到什麼，結果自己被濃霧和霧笛聲嚇得魂飛魄散，把吊飾隨手藏了起來，不敢承認自己膽小。',
    },
  }
);
