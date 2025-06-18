GET
https://jborjas31.github.io/secretary-ai/
[HTTP/2 200  374ms]

GET
https://jborjas31.github.io/secretary-ai/css/style.css
[HTTP/2 200  211ms]

GET
https://jborjas31.github.io/secretary-ai/css/task-management.css
[HTTP/2 200  201ms]

GET
https://jborjas31.github.io/secretary-ai/js/config.js
[HTTP/2 200  201ms]

GET
https://jborjas31.github.io/secretary-ai/js/validation-utils.js
[HTTP/2 200  191ms]

GET
https://jborjas31.github.io/secretary-ai/js/event-manager.js
[HTTP/2 200  254ms]

GET
https://jborjas31.github.io/secretary-ai/js/ui-components.js
[HTTP/2 200  252ms]

GET
https://jborjas31.github.io/secretary-ai/js/storage.js
[HTTP/2 200  254ms]

GET
https://jborjas31.github.io/secretary-ai/js/firestore.js
[HTTP/2 200  252ms]

GET
https://jborjas31.github.io/secretary-ai/js/task-data-service.js
[HTTP/2 200  242ms]

GET
https://jborjas31.github.io/secretary-ai/js/schedule-data-service.js
[HTTP/2 200  223ms]

GET
https://jborjas31.github.io/secretary-ai/js/task-parser.js
[HTTP/2 200  274ms]

GET
https://jborjas31.github.io/secretary-ai/js/llm-service.js
[HTTP/2 200  234ms]

GET
https://jborjas31.github.io/secretary-ai/js/app.js
[HTTP/2 200  234ms]

Ruleset ignored due to bad selector. task-management.css:618:52
Ruleset ignored due to bad selector. task-management.css:740:56
🚀 Initializing Secretary AI... app.js:56:21
Settings loaded: 
Object { openrouterApiKey: "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", selectedModel: "deepseek/deepseek-r1", refreshInterval: 30, notifications: true, theme: "light", localUpdatedAt: "2025-06-18T13:24:46.599Z" }
app.js:183:21
GET
https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js
[HTTP/2 200  88ms]

GET
https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js
[HTTP/3 200  62ms]

Firestore initialized successfully firestore.js:35:21
✅ Firestore initialized app.js:143:25
TaskDataService initialized successfully task-data-service.js:23:21
ScheduleDataService initialized successfully schedule-data-service.js:24:17
TaskDataService connected to StorageService storage.js:444:17
ScheduleDataService connected to StorageService storage.js:452:17
✅ Enhanced data services initialized app.js:153:25
SW registered:  
ServiceWorkerRegistration { installing: null, waiting: null, active: ServiceWorker, navigationPreload: NavigationPreloadManager, scope: "https://jborjas31.github.io/secretary-ai/", updateViaCache: "imports", onupdatefound: null, pushManager: PushManager }
secretary-ai:155:33
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=74618&CVER=22&X-HTTP-Session-Id=gsessionid&zx=r3z87tk5b8qb&t=1
[HTTP/2 200  212ms]

XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?gsessionid=0SkCn2JgHwKwp3Ru4qypJWsAVcnxx-UI96Wwx1Zr8lI&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=fpJLwtsDPrjviCReo-enfQ&AID=0&CI=0&TYPE=xmlhttp&zx=hqh9sx3tumoh&t=1

Loaded 128 tasks from Firestore task-data-service.js:225:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=0SkCn2JgHwKwp3Ru4qypJWsAVcnxx-UI96Wwx1Zr8lI&SID=fpJLwtsDPrjviCReo-enfQ&RID=74619&AID=131&zx=wu2oc6ixcty9&t=1
[HTTP/3 200  116ms]

XHRGET
https://jborjas31.github.io/secretary-ai/tasks.md
[HTTP/2 304  144ms]

Tasks parsed successfully: 
Object { todayTasks: [], undatedTasks: (4) […], upcomingTasks: (9) […], dailyTasks: (37) […], weeklyTasks: (45) […], monthlyTasks: (6) […], yearlyTasks: (2) […] }
task-parser.js:198:17
Tasks loaded and cached for Task Management app.js:205:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=0SkCn2JgHwKwp3Ru4qypJWsAVcnxx-UI96Wwx1Zr8lI&SID=fpJLwtsDPrjviCReo-enfQ&RID=74620&AID=132&zx=a1yr7w7pp5o1&t=1
[HTTP/3 200  140ms]

Schedule loaded for 2025-06-18 firestore.js:111:25
Using cached schedule app.js:212:25
✅ Secretary AI initialized successfully app.js:79:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=0SkCn2JgHwKwp3Ru4qypJWsAVcnxx-UI96Wwx1Zr8lI&SID=fpJLwtsDPrjviCReo-enfQ&RID=74621&AID=136&zx=i3i819n8oj5r&t=1
[HTTP/3 200  172ms]

🔄 Loading tasks for management view... app.js:934:21
TaskDataService available: true app.js:935:21
🖼️ Updating task management display... app.js:991:17
📂 Display: Tasks grouped by section: 
Array []
app.js:999:17
📭 No filtered tasks - showing empty state app.js:1006:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=0SkCn2JgHwKwp3Ru4qypJWsAVcnxx-UI96Wwx1Zr8lI&SID=fpJLwtsDPrjviCReo-enfQ&RID=74622&AID=138&zx=33ifb66oa3f&t=1
[HTTP/3 200  116ms]

Loaded 128 tasks from Firestore task-data-service.js:225:21
📊 Loaded from TaskDataService: 128 tasks app.js:940:25
✅ Task loading completed. Filtered tasks: 128 app.js:960:21
XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=0SkCn2JgHwKwp3Ru4qypJWsAVcnxx-UI96Wwx1Zr8lI&SID=fpJLwtsDPrjviCReo-enfQ&RID=74623&AID=269&zx=1ktikgcxk1o7&t=1
[HTTP/3 200  113ms]

XHRGET
https://jborjas31.github.io/secretary-ai/tasks.md
[HTTP/2 200  0ms]

Tasks parsed successfully: 
Object { todayTasks: [], undatedTasks: (4) […], upcomingTasks: (9) […], dailyTasks: (37) […], weeklyTasks: (45) […], monthlyTasks: (6) […], yearlyTasks: (2) […] }
task-parser.js:198:17
Attempting schedule generation with model: deepseek/deepseek-r1 llm-service.js:187:25
XHRPOST
https://openrouter.ai/api/v1/chat/completions
[HTTP/2 200  1600ms]

XHROPTIONS
https://openrouter.ai/api/v1/chat/completions
[HTTP/2 204  45ms]

XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=34448&CVER=22&X-HTTP-Session-Id=gsessionid&zx=cglivlvwily8&t=1
[HTTP/3 200  112ms]

XHRGET
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?gsessionid=pj0AG0i-Ixj6fMDJHO2rbd110yHGtOTWaGWAaPv2YzU&VER=8&database=projects/secretary-ai-1bad7/databases/(default)&RID=rpc&SID=A4SlGJOlOHO8JdiQrfanng&AID=0&CI=0&TYPE=xmlhttp&zx=ocrlxsog19o4&t=1

XHRPOST
https://firestore.googleapis.com/google.firestore.v1.Firestore/Write/channel?VER=8&database=projects/secretary-ai-1bad7/databases/(default)&gsessionid=pj0AG0i-Ixj6fMDJHO2rbd110yHGtOTWaGWAaPv2YzU&SID=A4SlGJOlOHO8JdiQrfanng&RID=34449&AID=1&zx=3imsyb6821l4&t=1
[HTTP/3 200  140ms]

Schedule saved for 2025-06-18 firestore.js:85:21
🖼️ Updating task management display... app.js:991:17
📂 Display: Tasks grouped by section: 
Array(6) [ "dailyTasks", "monthlyTasks", "undatedTasks", "upcomingTasks", "weeklyTasks", "yearlyTasks" ]
app.js:999:17
🔢 Section rendering order: 
Array(7) [ "todayTasks", "upcomingTasks", "dailyTasks", "weeklyTasks", "monthlyTasks", "yearlyTasks", "undatedTasks" ]
app.js:1015:17
📋 Section todayTasks: 0 tasks app.js:1020:21
📋 Section upcomingTasks: 16 tasks app.js:1020:21
✅ Rendered section: upcomingTasks with 16 tasks app.js:1025:25
📋 Section dailyTasks: 51 tasks app.js:1020:21
✅ Rendered section: dailyTasks with 51 tasks app.js:1025:25
📋 Section weeklyTasks: 45 tasks app.js:1020:21
✅ Rendered section: weeklyTasks with 45 tasks app.js:1025:25
📋 Section monthlyTasks: 6 tasks app.js:1020:21
✅ Rendered section: monthlyTasks with 6 tasks app.js:1025:25
📋 Section yearlyTasks: 2 tasks app.js:1020:21
✅ Rendered section: yearlyTasks with 2 tasks app.js:1025:25
📋 Section undatedTasks: 8 tasks app.js:1020:21
✅ Rendered section: undatedTasks with 8 tasks app.js:1025:25
🎨 Total sections rendered: 6 app.js:1029:17
Error submitting task form: TypeError: ValidationUtils.validateTask is not a function
    handleTaskFormSubmit https://jborjas31.github.io/secretary-ai/js/app.js:1180
    onSubmit https://jborjas31.github.io/secretary-ai/js/app.js:1157
    attachEventListeners https://jborjas31.github.io/secretary-ai/js/ui-components.js:208
    attachEventListeners https://jborjas31.github.io/secretary-ai/js/ui-components.js:205
    render https://jborjas31.github.io/secretary-ai/js/ui-components.js:179
    showTaskForm https://jborjas31.github.io/secretary-ai/js/app.js:1161
    handleTaskEdit https://jborjas31.github.io/secretary-ai/js/app.js:1349
    onTaskEdit https://jborjas31.github.io/secretary-ai/js/app.js:1090
    attachEventListeners https://jborjas31.github.io/secretary-ai/js/ui-components.js:358
    wrappedHandler https://jborjas31.github.io/secretary-ai/js/ui-components.js:40
    on https://jborjas31.github.io/secretary-ai/js/ui-components.js:44
    attachEventListeners https://jborjas31.github.io/secretary-ai/js/ui-components.js:355
    render https://jborjas31.github.io/secretary-ai/js/ui-components.js:289
    createTaskSection https://jborjas31.github.io/secretary-ai/js/app.js:1096
    updateTaskManagementDisplay https://jborjas31.github.io/secretary-ai/js/app.js:1022
    updateTaskManagementDisplay https://jborjas31.github.io/secretary-ai/js/app.js:1018
    updateUI https://jborjas31.github.io/secretary-ai/js/app.js:383
    refreshSchedule https://jborjas31.github.io/secretary-ai/js/app.js:308
    setupEventListeners https://jborjas31.github.io/secretary-ai/js/app.js:334
    initialize https://jborjas31.github.io/secretary-ai/js/app.js:74
    async* https://jborjas31.github.io/secretary-ai/js/app.js:1464
    EventListener.handleEvent* https://jborjas31.github.io/secretary-ai/js/app.js:1462
app.js:1209:21
Error submitting task form: TypeError: ValidationUtils.validateTask is not a function
    handleTaskFormSubmit https://jborjas31.github.io/secretary-ai/js/app.js:1180
    onSubmit https://jborjas31.github.io/secretary-ai/js/app.js:1157
    attachEventListeners https://jborjas31.github.io/secretary-ai/js/ui-components.js:208
    attachEventListeners https://jborjas31.github.io/secretary-ai/js/ui-components.js:205
    render https://jborjas31.github.io/secretary-ai/js/ui-components.js:179
    showTaskForm https://jborjas31.github.io/secretary-ai/js/app.js:1161
    onClick https://jborjas31.github.io/secretary-ai/js/app.js:865
    render https://jborjas31.github.io/secretary-ai/js/ui-components.js:454
    toggleViewMode https://jborjas31.github.io/secretary-ai/js/app.js:919
    setupEventListeners https://jborjas31.github.io/secretary-ai/js/app.js:337
    initialize https://jborjas31.github.io/secretary-ai/js/app.js:74
    async* https://jborjas31.github.io/secretary-ai/js/app.js:1464
    EventListener.handleEvent* https://jborjas31.github.io/secretary-ai/js/app.js:1462
app.js:1209:21
