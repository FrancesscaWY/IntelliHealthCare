import { createApp } from "vue";
import App from "./app/App.vue";
import router, { installAuthSessionRouteSync } from "./app/router";
import "./app/base.css";

const app = createApp(App);

app.use(router);
installAuthSessionRouteSync();
app.mount("#app");
