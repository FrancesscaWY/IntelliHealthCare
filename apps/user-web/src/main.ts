import { createApp } from "vue";
import App from "./app/App.vue";
import router, { installAuthSessionRouteSync } from "./app/router";
import "./app/base.css";

const bootDebugElement = document.querySelector<HTMLElement>("#boot-debug");

function updateBootDebug(message: string) {
  if (!bootDebugElement) {
    return;
  }

  bootDebugElement.textContent = `boot: ${message}`;
}

updateBootDebug("main.ts executing");

const app = createApp(App);

app.use(router);
installAuthSessionRouteSync();
app.mount("#app");
updateBootDebug(`vue mounted | route=${router.currentRoute.value.fullPath || "/"}`);
