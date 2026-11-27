import { settings, storageListeners } from "@common/utils/data/database";
import { elementBuilder } from "@common/utils/functions/dom";
import { findAllElements, findElement } from "@common/utils/functions/find-elements";
import { Feature } from "@features/feature";
import styles from "./poker-profile-links.module.css";

const OPPONENT = '[class*="opponent_"]';
const NAME = 'p[class*="name_"]';

let observer: MutationObserver | undefined;

function updateOpponent(opponent: Element) {
	const name = findElement(NAME, opponent, true);
	if (!name) return;

	const existingLink = findElement<HTMLAnchorElement>(`.${styles.profileLink}`, name, true);
	const playerId = /^player-([1-9]\d*)$/.exec(opponent.id)?.[1];
	const playerName = name.textContent.trim();

	if (!playerId || !playerName || findElement(`a:not(.${styles.profileLink}), button`, name, true)) {
		existingLink?.remove();
		return;
	}

	const link = existingLink ?? elementBuilder({ type: "a" });
	link.href = `/profiles.php?XID=${playerId}`;
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	link.setAttribute("aria-label", `Open ${playerName}'s profile in a new tab`);

	// Keep Torn's name text in place so React can continue updating it.
	if (!existingLink) {
		link.className = styles.profileLink;
		name.append(link);
	}
}

function syncProfileLinks() {
	observer?.disconnect();
	observer = undefined;

	if (!settings.pages.casino.pokerProfileLinks) {
		findAllElements(`.${styles.profileLink}`).forEach((link) => link.remove());
		return;
	}

	findAllElements(OPPONENT).forEach(updateOpponent);

	observer = new MutationObserver((records) => {
		const opponents = new Set<Element>();
		for (const { target, addedNodes } of records) {
			const element = target instanceof Element ? target : target.parentElement;
			const opponent = element?.closest(OPPONENT);
			if (opponent) opponents.add(opponent);

			for (const node of addedNodes) {
				if (!(node instanceof Element) || opponent) continue;
				if (node.matches(OPPONENT)) opponents.add(node);
				findAllElements(OPPONENT, node).forEach((seat) => opponents.add(seat));
			}
		}
		opponents.forEach((opponent) => {
			if (opponent.isConnected) updateOpponent(opponent);
		});
	});
	observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["id"] });
}

export default class PokerProfileLinksFeature extends Feature {
	constructor() {
		super("Poker Profile Links", "casino");
	}

	override isEnabled() {
		return settings.pages.casino.pokerProfileLinks;
	}

	override initialise() {
		storageListeners.settings.push((oldSettings) => {
			if (oldSettings?.pages.casino.pokerProfileLinks && !settings.pages.casino.pokerProfileLinks) syncProfileLinks();
		});
	}

	override execute() {
		syncProfileLinks();
	}

	override reload() {
		syncProfileLinks();
	}

	override storageKeys() {
		return ["settings.pages.casino.pokerProfileLinks"];
	}
}
