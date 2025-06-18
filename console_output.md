GET
https://jborjas31.github.io/secretary-ai/
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/css/style.css
[HTTP/2 200 OK 0ms]

GET
https://jborjas31.github.io/secretary-ai/css/task-management.css
[HTTP/2 200 OK 0ms]

GET
https://jborjas31.github.io/secretary-ai/js/config.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/validation-utils.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/event-manager.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/ui-components.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/storage.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/firestore.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/task-data-service.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/schedule-data-service.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/task-parser.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/llm-service.js
[HTTP/1.1 200  0ms]

GET
https://jborjas31.github.io/secretary-ai/js/app.js
[HTTP/1.1 200  0ms]

🚀 Initializing Secretary AI... app.js:56:21
Settings loaded: 
Object { openrouterApiKey: "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", selectedModel: "deepseek/deepseek-r1", refreshInterval: 30, notifications: true, theme: "light", localUpdatedAt: "2025-06-18T16:37:58.391Z" }
app.js:188:21
GET
https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js
[HTTP/2 200  0ms]

GET
https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js
[HTTP/2 200  0ms]

Firestore initialized successfully firestore.js:35:21
✅ Firestore initialized app.js:148:25
TaskDataService initialized successfully task-data-service.js:23:21
ScheduleDataService initialized successfully schedule-data-service.js:24:17
TaskDataService connected to StorageService storage.js:444:17
ScheduleDataService connected to StorageService storage.js:452:17
✅ Enhanced data services initialized app.js:158:25
SW registered:  
ServiceWorkerRegistration { installing: null, waiting: null, active: ServiceWorker, navigationPreload: NavigationPreloadManager, scope: "https://jborjas31.github.io/secretary-ai/", updateViaCache: "imports", onupdatefound: null, pushManager: PushManager }
secretary-ai:155:33
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=29777&CVER=22&X-HTTP-Session-Id=gsessionid&zx=getsh2rvkqis&t=1
[HTTP/3 200  160ms]

XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?gsessionid=TNm2ZwZ8aAg43tffVrg7YPKOKgrJ3NCm3gyJUog3jtg&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=maiCIC_lECs11LvWUeUYbA&AID=0&CI=0&TYPE=xmlhttp&zx=spn10n367sye&t=1
[HTTP/3 200  70293ms]

Loaded 129 tasks from Firestore task-data-service.js:225:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=TNm2ZwZ8aAg43tffVrg7YPKOKgrJ3NCm3gyJUog3jtg&SID=maiCIC_lECs11LvWUeUYbA&RID=29778&AID=134&zx=l9nh7kl2m02m&t=1
[HTTP/3 200  139ms]

XHRGET
https://jborjas31.github.io/secretary-ai/tasks.md
[HTTP/1.1 200  0ms]

Tasks parsed successfully: 
Object { todayTasks: [], undatedTasks: (4) […], upcomingTasks: (9) […], dailyTasks: (37) […], weeklyTasks: (45) […], monthlyTasks: (6) […], yearlyTasks: (2) […] }
task-parser.js:198:17
Tasks loaded and cached for Task Management app.js:210:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=TNm2ZwZ8aAg43tffVrg7YPKOKgrJ3NCm3gyJUog3jtg&SID=maiCIC_lECs11LvWUeUYbA&RID=29779&AID=135&zx=m2i17o9o80s9&t=1
[HTTP/3 200  164ms]

Schedule loaded for 2025-06-18 firestore.js:111:25
Using cached schedule app.js:217:25
✅ Secretary AI initialized successfully app.js:84:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=TNm2ZwZ8aAg43tffVrg7YPKOKgrJ3NCm3gyJUog3jtg&SID=maiCIC_lECs11LvWUeUYbA&RID=29780&AID=139&zx=5g45zjdpzn4m&t=1
[HTTP/3 200  159ms]

🔄 Loading tasks for management view... app.js:939:21
TaskDataService available: true app.js:940:21
🖼️ Updating task management display... app.js:996:17
📂 Display: Tasks grouped by section: 
Array []
app.js:1004:17
📭 No filtered tasks - showing empty state app.js:1011:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=TNm2ZwZ8aAg43tffVrg7YPKOKgrJ3NCm3gyJUog3jtg&SID=maiCIC_lECs11LvWUeUYbA&RID=29781&AID=140&zx=eocog4hkb3e6&t=1
[HTTP/3 200  134ms]

Loaded 129 tasks from Firestore task-data-service.js:225:21
📊 Loaded from TaskDataService: 129 tasks app.js:945:25
✅ Task loading completed. Filtered tasks: 129 app.js:965:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=TNm2ZwZ8aAg43tffVrg7YPKOKgrJ3NCm3gyJUog3jtg&SID=maiCIC_lECs11LvWUeUYbA&RID=29782&AID=272&zx=3xbn73ujj6k&t=1
[HTTP/3 200  166ms]

XHRGET
https://jborjas31.github.io/secretary-ai/tasks.md
[HTTP/1.1 200  0ms]

Tasks parsed successfully: 
Object { todayTasks: [], undatedTasks: (4) […], upcomingTasks: (9) […], dailyTasks: (37) […], weeklyTasks: (45) […], monthlyTasks: (6) […], yearlyTasks: (2) […] }
task-parser.js:198:17
Attempting schedule generation with model: deepseek/deepseek-r1 llm-service.js:187:25
XHRPOST
https://openrouter.ai/api/v1/chat/completions
[HTTP/2 200  1746ms]

XHROPTIONS
https://openrouter.ai/api/v1/chat/completions
[HTTP/2 204  148ms]

XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=70372&CVER=22&X-HTTP-Session-Id=gsessionid&zx=5c6ol9j6l71&t=1
[HTTP/3 200  142ms]

XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?gsessionid=GOtp74Di8fegjuNOyimJfno4a2lUfXAgQQjjtolOOAs&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=7XXCLM0aSB_b1M0-nuczDA&AID=0&CI=0&TYPE=xmlhttp&zx=fq3iiefl3a7c&t=1
[HTTP/3 200  61430ms]

XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=GOtp74Di8fegjuNOyimJfno4a2lUfXAgQQjjtolOOAs&SID=7XXCLM0aSB_b1M0-nuczDA&RID=70373&AID=1&zx=r00r65r1bwyw&t=1
[HTTP/3 200  412ms]

Schedule saved for 2025-06-18 firestore.js:85:21
🖼️ Updating task management display... app.js:996:17
📂 Display: Tasks grouped by section: 
Array(6) [ "dailyTasks", "monthlyTasks", "weeklyTasks", "undatedTasks", "upcomingTasks", "yearlyTasks" ]
app.js:1004:17
🔢 Section rendering order: 
Array(7) [ "todayTasks", "upcomingTasks", "dailyTasks", "weeklyTasks", "monthlyTasks", "yearlyTasks", "undatedTasks" ]
app.js:1020:17
📋 Section todayTasks: 0 tasks app.js:1025:21
📋 Section upcomingTasks: 16 tasks app.js:1025:21
✅ Rendered section: upcomingTasks with 16 tasks app.js:1030:25
📋 Section dailyTasks: 51 tasks app.js:1025:21
✅ Rendered section: dailyTasks with 51 tasks app.js:1030:25
📋 Section weeklyTasks: 46 tasks app.js:1025:21
✅ Rendered section: weeklyTasks with 46 tasks app.js:1030:25
📋 Section monthlyTasks: 6 tasks app.js:1025:21
✅ Rendered section: monthlyTasks with 6 tasks app.js:1030:25
📋 Section yearlyTasks: 2 tasks app.js:1025:21
✅ Rendered section: yearlyTasks with 2 tasks app.js:1030:25
📋 Section undatedTasks: 8 tasks app.js:1025:21
✅ Rendered section: undatedTasks with 8 tasks app.js:1030:25
🎨 Total sections rendered: 6 app.js:1034:17
XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?gsessionid=TNm2ZwZ8aAg43tffVrg7YPKOKgrJ3NCm3gyJUog3jtg&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=maiCIC_lECs11LvWUeUYbA&AID=275&CI=0&TYPE=xmlhttp&zx=w5dl42du6h6y&t=1
[HTTP/3 200  4297ms]

POST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=TNm2ZwZ8aAg43tffVrg7YPKOKgrJ3NCm3gyJUog3jtg&SID=maiCIC_lECs11LvWUeUYbA&RID=29783&TYPE=terminate&zx=tn98h7es1tkp
[HTTP/3 200  144ms]

POST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=GOtp74Di8fegjuNOyimJfno4a2lUfXAgQQjjtolOOAs&SID=7XXCLM0aSB_b1M0-nuczDA&RID=70374&TYPE=terminate&zx=2cj70agyp2ub
[HTTP/3 200  146ms]

XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?gsessionid=GOtp74Di8fegjuNOyimJfno4a2lUfXAgQQjjtolOOAs&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=7XXCLM0aSB_b1M0-nuczDA&AID=4&CI=0&TYPE=xmlhttp&zx=w5ru3ml5pbx8&t=1
[HTTP/3 400  246ms]

XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=15204&CVER=22&X-HTTP-Session-Id=gsessionid&zx=z2qviv9w9szg&t=1
[HTTP/3 200  157ms]

XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?gsessionid=qlVc8du3_HG6iJa5uZf2jvptGPIiEXej0Yo-e5kq83o&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=QD8RmMUgGTAgAqN3G6N9AA&AID=0&CI=0&TYPE=xmlhttp&zx=5u8rnbc4l8bq&t=1
[HTTP/3 200  57065ms]

XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=qlVc8du3_HG6iJa5uZf2jvptGPIiEXej0Yo-e5kq83o&SID=QD8RmMUgGTAgAqN3G6N9AA&RID=15205&AID=1&zx=okl4ipdxcx60&t=1
[HTTP/3 200  164ms]

Task updated: task-1750257655571-hovs9jm8p task-data-service.js:140:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=79604&CVER=22&X-HTTP-Session-Id=gsessionid&zx=cb6no6jccxap&t=1
[HTTP/3 200  154ms]

XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?gsessionid=nLK16wJL8ssomZ9wFjPv-k4pUd8XGJXimHOrr1Mz_QM&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=KPuJHnze2O6l8VZrhv0vrA&AID=0&CI=0&TYPE=xmlhttp&zx=oelpyup8vwva&t=1
[HTTP/3 200  63626ms]

Task updated event received: task-1750257655571-hovs9jm8p 
Object { text: "Test #1 Weekly", section: "weeklyTasks", priority: "low", date: null, estimatedDuration: null, subTasks: [], id: "task-1750257655571-hovs9jm8p", reminders: [] }
app.js:1399:17
🖼️ Updating task management display... app.js:996:17
📂 Display: Tasks grouped by section: 
Array(6) [ "dailyTasks", "monthlyTasks", "weeklyTasks", "undatedTasks", "upcomingTasks", "yearlyTasks" ]
app.js:1004:17
🔢 Section rendering order: 
Array(7) [ "todayTasks", "upcomingTasks", "dailyTasks", "weeklyTasks", "monthlyTasks", "yearlyTasks", "undatedTasks" ]
app.js:1020:17
📋 Section todayTasks: 0 tasks app.js:1025:21
📋 Section upcomingTasks: 16 tasks app.js:1025:21
✅ Rendered section: upcomingTasks with 16 tasks app.js:1030:25
📋 Section dailyTasks: 51 tasks app.js:1025:21
✅ Rendered section: dailyTasks with 51 tasks app.js:1030:25
📋 Section weeklyTasks: 46 tasks app.js:1025:21
✅ Rendered section: weeklyTasks with 46 tasks app.js:1030:25
📋 Section monthlyTasks: 6 tasks app.js:1025:21
✅ Rendered section: monthlyTasks with 6 tasks app.js:1030:25
📋 Section yearlyTasks: 2 tasks app.js:1025:21
✅ Rendered section: yearlyTasks with 2 tasks app.js:1030:25
📋 Section undatedTasks: 8 tasks app.js:1025:21
✅ Rendered section: undatedTasks with 8 tasks app.js:1030:25
🎨 Total sections rendered: 6 app.js:1034:17
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=nLK16wJL8ssomZ9wFjPv-k4pUd8XGJXimHOrr1Mz_QM&SID=KPuJHnze2O6l8VZrhv0vrA&RID=79605&AID=5&zx=906hcplgc2d3&t=1
[HTTP/3 200  151ms]

XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=qlVc8du3_HG6iJa5uZf2jvptGPIiEXej0Yo-e5kq83o&SID=QD8RmMUgGTAgAqN3G6N9AA&RID=15206&AID=2&zx=l1gs6qomyzat&t=1
[HTTP/3 200  154ms]

Task created: task-1750265046793-180sjzbg1 task-data-service.js:97:21
Task created event received: 
Object { id: "task-1750265046793-180sjzbg1", text: "Test #2 weekly", section: "todayTasks", priority: "low", date: null, completed: false, subTasks: [], reminders: [], details: [], createdAt: "2025-06-18T16:44:06.792Z", … }
app.js:1384:17
🖼️ Updating task management display... app.js:996:17
📂 Display: Tasks grouped by section: 
Array(7) [ "dailyTasks", "monthlyTasks", "weeklyTasks", "undatedTasks", "upcomingTasks", "yearlyTasks", "todayTasks" ]
app.js:1004:17
🔢 Section rendering order: 
Array(7) [ "todayTasks", "upcomingTasks", "dailyTasks", "weeklyTasks", "monthlyTasks", "yearlyTasks", "undatedTasks" ]
app.js:1020:17
📋 Section todayTasks: 1 tasks app.js:1025:21
✅ Rendered section: todayTasks with 1 tasks app.js:1030:25
📋 Section upcomingTasks: 16 tasks app.js:1025:21
✅ Rendered section: upcomingTasks with 16 tasks app.js:1030:25
📋 Section dailyTasks: 51 tasks app.js:1025:21
✅ Rendered section: dailyTasks with 51 tasks app.js:1030:25
📋 Section weeklyTasks: 46 tasks app.js:1025:21
✅ Rendered section: weeklyTasks with 46 tasks app.js:1030:25
📋 Section monthlyTasks: 6 tasks app.js:1025:21
✅ Rendered section: monthlyTasks with 6 tasks app.js:1030:25
📋 Section yearlyTasks: 2 tasks app.js:1025:21
✅ Rendered section: yearlyTasks with 2 tasks app.js:1030:25
📋 Section undatedTasks: 8 tasks app.js:1025:21
✅ Rendered section: undatedTasks with 8 tasks app.js:1030:25
🎨 Total sections rendered: 7 app.js:1034:17
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=qlVc8du3_HG6iJa5uZf2jvptGPIiEXej0Yo-e5kq83o&SID=QD8RmMUgGTAgAqN3G6N9AA&RID=15207&AID=4&zx=d266luu4k4s3&t=1
[HTTP/3 200  155ms]

Task created: task-1750265088578-i4oidgsnl task-data-service.js:97:21
Task created event received: 
Object { id: "task-1750265088578-i4oidgsnl", text: "Test Yearly", section: "yearlyTasks", priority: "low", date: null, completed: false, subTasks: [], reminders: [], details: [], createdAt: "2025-06-18T16:44:48.578Z", … }
app.js:1384:17
🖼️ Updating task management display... app.js:996:17
📂 Display: Tasks grouped by section: 
Array(7) [ "dailyTasks", "monthlyTasks", "weeklyTasks", "undatedTasks", "upcomingTasks", "yearlyTasks", "todayTasks" ]
app.js:1004:17
🔢 Section rendering order: 
Array(7) [ "todayTasks", "upcomingTasks", "dailyTasks", "weeklyTasks", "monthlyTasks", "yearlyTasks", "undatedTasks" ]
app.js:1020:17
📋 Section todayTasks: 1 tasks app.js:1025:21
✅ Rendered section: todayTasks with 1 tasks app.js:1030:25
📋 Section upcomingTasks: 16 tasks app.js:1025:21
✅ Rendered section: upcomingTasks with 16 tasks app.js:1030:25
📋 Section dailyTasks: 51 tasks app.js:1025:21
✅ Rendered section: dailyTasks with 51 tasks app.js:1030:25
📋 Section weeklyTasks: 46 tasks app.js:1025:21
✅ Rendered section: weeklyTasks with 46 tasks app.js:1030:25
📋 Section monthlyTasks: 6 tasks app.js:1025:21
✅ Rendered section: monthlyTasks with 6 tasks app.js:1030:25
📋 Section yearlyTasks: 3 tasks app.js:1025:21
✅ Rendered section: yearlyTasks with 3 tasks app.js:1030:25
📋 Section undatedTasks: 8 tasks app.js:1025:21
✅ Rendered section: undatedTasks with 8 tasks app.js:1030:25
🎨 Total sections rendered: 7 app.js:1034:17
XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?gsessionid=qlVc8du3_HG6iJa5uZf2jvptGPIiEXej0Yo-e5kq83o&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=QD8RmMUgGTAgAqN3G6N9AA&AID=5&CI=0&TYPE=xmlhttp&zx=keio1icuk6v&t=1

POST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=nLK16wJL8ssomZ9wFjPv-k4pUd8XGJXimHOrr1Mz_QM&SID=KPuJHnze2O6l8VZrhv0vrA&RID=79606&TYPE=terminate&zx=2q02kgkznv1k
[HTTP/3 200  150ms]

🖼️ Updating task management display... app.js:996:17
📂 Display: Tasks grouped by section: 
Array(4) [ "monthlyTasks", "weeklyTasks", "todayTasks", "yearlyTasks" ]
app.js:1004:17
🔢 Section rendering order: 
Array(7) [ "todayTasks", "upcomingTasks", "dailyTasks", "weeklyTasks", "monthlyTasks", "yearlyTasks", "undatedTasks" ]
app.js:1020:17
📋 Section todayTasks: 1 tasks app.js:1025:21
✅ Rendered section: todayTasks with 1 tasks app.js:1030:25
📋 Section upcomingTasks: 0 tasks app.js:1025:21
📋 Section dailyTasks: 0 tasks app.js:1025:21
📋 Section weeklyTasks: 1 tasks app.js:1025:21
✅ Rendered section: weeklyTasks with 1 tasks app.js:1030:25
📋 Section monthlyTasks: 1 tasks app.js:1025:21
✅ Rendered section: monthlyTasks with 1 tasks app.js:1030:25
📋 Section yearlyTasks: 1 tasks app.js:1025:21
✅ Rendered section: yearlyTasks with 1 tasks app.js:1030:25
📋 Section undatedTasks: 0 tasks app.js:1025:21
🎨 Total sections rendered: 4 app.js:1034:17
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=qlVc8du3_HG6iJa5uZf2jvptGPIiEXej0Yo-e5kq83o&SID=QD8RmMUgGTAgAqN3G6N9AA&RID=15208&AID=7&zx=p57aipf8xhmo&t=1
[HTTP/3 200  136ms]

Task updated: task-1750265046793-180sjzbg1 task-data-service.js:140:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=87215&CVER=22&X-HTTP-Session-Id=gsessionid&zx=y7o0jgrov3p0&t=1
[HTTP/3 200  251ms]

XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?gsessionid=GMj--vasDI7Kjzx1jxB44c9azrObY-VI48ztHnGkXu4&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=gs5yGXr9o4sYPEqURat-Og&AID=0&CI=0&TYPE=xmlhttp&zx=1w8jaa8r8xbz&t=1

Task updated event received: task-1750265046793-180sjzbg1 
Object { text: "Test Today", section: "todayTasks", priority: "low", date: null, estimatedDuration: null, subTasks: [], id: "task-1750265046793-180sjzbg1", reminders: [] }
app.js:1399:17
🖼️ Updating task management display... app.js:996:17
📂 Display: Tasks grouped by section: 
Array(4) [ "monthlyTasks", "weeklyTasks", "todayTasks", "yearlyTasks" ]
app.js:1004:17
🔢 Section rendering order: 
Array(7) [ "todayTasks", "upcomingTasks", "dailyTasks", "weeklyTasks", "monthlyTasks", "yearlyTasks", "undatedTasks" ]
app.js:1020:17
📋 Section todayTasks: 1 tasks app.js:1025:21
✅ Rendered section: todayTasks with 1 tasks app.js:1030:25
📋 Section upcomingTasks: 0 tasks app.js:1025:21
📋 Section dailyTasks: 0 tasks app.js:1025:21
📋 Section weeklyTasks: 1 tasks app.js:1025:21
✅ Rendered section: weeklyTasks with 1 tasks app.js:1030:25
📋 Section monthlyTasks: 1 tasks app.js:1025:21
✅ Rendered section: monthlyTasks with 1 tasks app.js:1030:25
📋 Section yearlyTasks: 1 tasks app.js:1025:21
✅ Rendered section: yearlyTasks with 1 tasks app.js:1030:25
📋 Section undatedTasks: 0 tasks app.js:1025:21
🎨 Total sections rendered: 4 app.js:1034:17
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=GMj--vasDI7Kjzx1jxB44c9azrObY-VI48ztHnGkXu4&SID=gs5yGXr9o4sYPEqURat-Og&RID=87216&AID=5&zx=ykwlmh75doy&t=1
[HTTP/3 200  155ms]

