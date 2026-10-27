# 생성 에셋

2026-10-27: 지시서 UI는 CSS 기반 검정·녹색 터미널로 변경되었습니다. 아래 parchment 이미지는 원본 에셋으로 보관하지만 현재 UI에서는 사용하지 않습니다. 봇 아바타는 계속 사용합니다.

Built-in imagegen 사용. 2026-10-26 생성. UI 글자는 이미지에 넣지 않고 HTML로 렌더링합니다.

- `public/assets/bot-roster.png`: 4×2 초상화 시트. 초기 7개 슬롯에는 첫 7개 타일을 사용하며 추가 봇은 8개 타일을 순환해 기본 아바타로 사용합니다. 실제 사진을 등록하면 해당 이미지로 대체합니다. CSS background-position으로 사용하며 원본 이미지를 변경하지 않았습니다.
- `public/assets/parchment.png`: 두루마리 지시서의 종이 질감. UI에서 본문을 그 위에 렌더링합니다.

## Avatar prompt

Use case: stylized-concept. Asset type: one avatar roster atlas for a dark AI bot command center web app. Create a precise 4 columns by 2 rows grid of eight evenly sized square portraits, each centered within its own tile with generous padding. Seven distinct friendly minimalist futuristic robot heads and an eighth spare. All heads use matte ivory ceramic and charcoal metal, dark glossy face visor, tiny white eyes, subtle variation of antenna and shape; first top-left is the leader with a subtle crown-like antenna. Restrained premium 3D product render, soft studio lighting, near-black uniform background across every tile, no tile borders, no text, no letters, no logos, no watermark. Each head entirely contained within its grid tile. Landscape aspect ratio 2:1.

## Parchment prompt

Use case: stylized-concept. Asset type: background texture for a readable game quest scroll in a sophisticated dark AI bot dashboard. Flat straight-on closeup of warm off-white archival parchment paper, subtle realistic fine paper grain and very faint softly aged beige edges. Portrait rectangle, entire image filled with paper. Center clean and nearly uniform so black user interface text will be legible on top. No text, no symbols, no illustrations, no objects, no rolls, no shadows across center, no borders or watermark.

Paperlogy 원 배포처: https://freesentation.blog/paperlogyfont
웹폰트: https://github.com/fonts-archive/Paperlogy
로컬 Regular/SemiBold WOFF2 포함. 라이선스는 `public/fonts/LICENSE.txt`를 참조합니다.

## City mark and motion, 2026-10-27

`public/assets/city-mark.png` was generated with the built-in imagegen tool (transparent background), inspected and copied into this repository. Prompt: "Create a single refined Grokbot City application icon, inspired by the Grok circular orbit and ascending diagonal slash visual language, with an original subtle robot face (two precise cutout eyes) within the orbital mark. Pure white flat geometric symbol for a black terminal dashboard. No text, no wordmark, no gradients, no shadow, no extra objects. Strong recognizable silhouette at28px. Centered, generous but not excessive padding, square composition. Truly transparent background. This is a new original companion-app mark, not a copy of the Grok logo."

Motion research: [Chrome View Transitions demos](https://view-transitions.chrome.dev/), [Codrops panel transitions](https://tympanus.net/codrops/2013/04/23/fullscreen-layout-with-page-transitions/). Implementation is original CSS:360ms shared card transitions,160/260ms fade/slide page transitions, smooth progress widths, subtle heartbeat and pastel color changes. Reduced-motion preference disables movement. No external template runtime or copied template assets. [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) informed the EventSource transport.


## Flow workbench reference and empty-state asset (2026-10-27)

Reviewed public [FlowCraft repository](https://github.com/sleeplesshan/flowcraft-task-studio), `app/TaskNode.tsx`, `app/WorkflowCanvas.tsx`, and [live demo](https://flowtaskstudio.netlify.app/): task-first node cards, branching dependencies, dotted canvas, fit/zoom controls. Grokbot City's implementation is original React HTML/SVG adapted to its dark mint theme; no source copied and no FlowCraft runtime dependency.

Built-in imagegen generated `public/assets/flow-navigator.png`, inspected and copied to workspace. Prompt: "Use case: stylized-concept. Asset type: tiny empty-state illustration for a dark Grokbot City task workflow panel. A refined matte graphite miniature robot navigator gently inspecting a small floating map of three connected frosted glass blocks, with a single restrained mint luminous path. Original sophisticated industrial design, subtle soft reflections, sculptural3D, clean silhouette, centered compact composition with generous transparent negative space. No text, letters, numbers, logos, dashboard, UI screenshot or background. Not a workflow diagram used for actual data; an editorial companion illustration for awaiting bot planning. Transparent background."

Real nodes are accessible HTML buttons; dependencies SVG curves, active edges use subtle moving dashes, completed/active/blocked nodes use distinct borders and status text. Reduced motion disables repeated animation. Saved data never depends on the generated raster image.
