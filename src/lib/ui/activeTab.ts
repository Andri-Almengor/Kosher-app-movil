import type { AppTabKey } from "./tabReset";

let currentTab: AppTabKey | null = "Inicio";

export function setCurrentTab(tab: AppTabKey | null) {
  currentTab = tab;
}

export function getCurrentTab() {
  return currentTab;
}
