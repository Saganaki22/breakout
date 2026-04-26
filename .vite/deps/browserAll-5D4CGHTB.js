import {
  AccessibilitySystem,
  DOMPipe,
  EventSystem,
  FederatedContainer,
  accessibilityTarget
} from "./chunk-I2WSHTFU.js";
import "./chunk-CRPP7B4P.js";
import "./chunk-Q4QN7IS3.js";
import "./chunk-W3PHOAVR.js";
import {
  Container
} from "./chunk-E5BN425C.js";
import "./chunk-EFUTS62J.js";
import "./chunk-S3OCQR2J.js";
import "./chunk-DSUQR63W.js";
import {
  extensions
} from "./chunk-UFGTUJO7.js";

// node_modules/pixi.js/lib/accessibility/init.mjs
extensions.add(AccessibilitySystem);
extensions.mixin(Container, accessibilityTarget);

// node_modules/pixi.js/lib/dom/init.mjs
extensions.add(DOMPipe);

// node_modules/pixi.js/lib/events/init.mjs
extensions.add(EventSystem);
extensions.mixin(Container, FederatedContainer);
//# sourceMappingURL=browserAll-5D4CGHTB.js.map
