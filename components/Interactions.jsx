'use client';
import { useEffect } from 'react';
import { basePath, legacyRoutes } from '../lib/client-routes';

export default function Interactions() {
  useEffect(() => {
    const legacy = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''));
    if (legacyRoutes.includes(legacy)) window.location.replace(`${basePath}/en/${legacy === 'home' ? '' : `${legacy}/`}`);
    // Wix exports may leave the tab buttons as static HTML instead of React Tabs.
    // Make those fallback tabs interactive without replacing their original content.
    const activateLegacyTab = (tab) => {
      const root = tab.closest('.wixui-tabs:not(.km-tabs)');
      if (!root) return false;
      const tabs = [...root.querySelectorAll('[role="tablist"] [role="tab"]')];
      const panels = [...root.querySelectorAll('[role="tabpanel"]')];
      const selected = tabs.indexOf(tab);
      if (selected < 0 || !panels.length) return false;
      tabs.forEach((button, index) => {
        const active = index === selected;
        button.setAttribute('aria-selected', String(active));
        button.setAttribute('tabindex', active ? '0' : '-1');
        button.classList.toggle('TabsList2027980309--current', active);
        button.dataset.testid = active ? 'ActiveTabItem' : '';
      });
      panels.forEach((panel, index) => {
        const active = panel.getAttribute('aria-labelledby') === tab.id ||
          (!panel.getAttribute('aria-labelledby') && index === selected);
        panel.hidden = !active;
        panel.setAttribute('aria-hidden', String(!active));
        panel.classList.toggle('Tabscomponent1176390459--isVisible', active);
        panel.style.setProperty('display', active ? '' : 'none', active ? '' : 'important');
        panel.style.visibility = active ? 'visible' : 'hidden';
      });
      return true;
    };
    document.querySelectorAll('.wixui-tabs:not(.km-tabs)').forEach((root) => {
      const initial = root.querySelector('[role="tab"][aria-selected="true"]') ||
        root.querySelector('[role="tablist"] [role="tab"]');
      if (initial) activateLegacyTab(initial);
    });
    // Recover interactive behavior for Wix dropdowns whose original scripts were not exported.
    // Only reuse choices already present in the exported DOM; never manufacture application data.
    const dropdownSelector = '[role="combobox"], wix-dropdown, .wixui-dropdown, [data-hook*="dropdown"], [data-hook*="Dropdown"]';
    const findDropdown = (element) => element.closest(dropdownSelector);
    let openDropdown = null;
    const closeDropdown = () => {
      if (!openDropdown) return;
      const { trigger, list } = openDropdown;
      trigger.setAttribute('aria-expanded', 'false');
      list.hidden = true;
      list.style.setProperty('display', 'none', 'important');
      openDropdown = null;
    };
    const toggleDropdown = (trigger) => {
      const wrapper = trigger.closest('.wixui-dropdown, wix-dropdown, [data-hook*="dropdown"], [data-hook*="Dropdown"]') || trigger.parentElement;
      const list = wrapper?.querySelector('[role="listbox"], [data-hook*="option-list"], [data-hook*="dropdown-options"], ul[role="presentation"]');
      if (!list) return false;
      if (openDropdown?.trigger === trigger) { closeDropdown(); return true; }
      closeDropdown();
      list.hidden = false;
      list.style.setProperty('display', 'block', 'important');
      trigger.setAttribute('aria-expanded', 'true');
      openDropdown = { trigger, list };
      return true;
    };
    const chooseDropdownOption = (option) => {
      if (!openDropdown || !openDropdown.list.contains(option)) return false;
      const { trigger, list } = openDropdown;
      const value = option.getAttribute('data-value') || option.textContent?.trim() || '';
      const label = option.textContent?.trim() || value;
      if (!label) return false;
      const valueNode = trigger.querySelector('[data-hook*="selected"], [data-hook*="placeholder"], .dropdown-placeholder') || trigger;
      if (valueNode === trigger && trigger.matches('input')) trigger.value = label;
      else valueNode.textContent = label;
      trigger.dataset.value = value;
      const hiddenInput = trigger.closest('form')?.querySelector('input[type="hidden"][name="' + (trigger.getAttribute('name') || '') + '"]');
      if (hiddenInput && trigger.getAttribute('name')) hiddenInput.value = value;
      list.querySelectorAll('[aria-selected]').forEach((node) => node.setAttribute('aria-selected', String(node === option)));
      trigger.dispatchEvent(new Event('change', { bubbles: true }));
      closeDropdown();
      return true;
    };
    const click = (event) => {
      if (event.target instanceof Element) {
        const tab = event.target.closest('.wixui-tabs:not(.km-tabs) [role="tab"]');
        if (tab && activateLegacyTab(tab)) return;
      }
      if (!(event.target instanceof Element)) return;
      const option = event.target.closest('[role="option"], [data-hook*="dropdown-item"], [data-hook*="option-item"]');
      if (option && chooseDropdownOption(option)) { event.preventDefault(); return; }
      const combo = event.target.closest('[role="combobox"], .wixui-dropdown [role="button"], wix-dropdown [role="button"]');
      if (combo && toggleDropdown(combo)) { event.preventDefault(); return; }
      if (openDropdown && !openDropdown.list.contains(event.target)) closeDropdown();
      const trigger = event.target.closest('wix-dropdown-menu [role="button"]');
      if (trigger) {
        const item = trigger.closest('li');
        if (item) trigger.setAttribute('aria-expanded', String(item.toggleAttribute('data-open')));
      }
      if (event.target.closest('[data-export-disabled]')) {
        event.preventDefault();
        window.alert('This feature is awaiting connection to the company backend.');
      }
    };
    const keydown = (event) => {
      if (event.key === 'Escape') closeDropdown();
      if (event.target instanceof Element) {
        const combo = event.target.closest('[role="combobox"], .wixui-dropdown [role="button"], wix-dropdown [role="button"]');
        if (combo && ['Enter', ' ', 'ArrowDown'].includes(event.key)) {
          if (toggleDropdown(combo)) { event.preventDefault(); return; }
        }
        if (openDropdown && ['Enter', ' '].includes(event.key)) {
          const option = event.target.closest('[role="option"], [data-hook*="dropdown-item"]');
          if (option && chooseDropdownOption(option)) { event.preventDefault(); return; }
        }
      }
      if (event.target instanceof Element) {
        const tab = event.target.closest('.wixui-tabs:not(.km-tabs) [role="tab"]');
        if (tab) {
          const tabs = [...tab.closest('.wixui-tabs').querySelectorAll('[role="tablist"] [role="tab"]')];
          const index = tabs.indexOf(tab);
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else if (event.key !== 'Enter' && event.key !== ' ') next = -1;
          if (next >= 0) {
            event.preventDefault();
            activateLegacyTab(tabs[next]);
            tabs[next].focus();
            return;
          }
        }
      }
      if (event.key === 'Escape') document.querySelectorAll('[data-open]').forEach((el) => {
        el.removeAttribute('data-open');
        el.querySelector('[aria-expanded]')?.setAttribute('aria-expanded', 'false');
      });
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element && event.target.matches('wix-dropdown-menu [role="button"]')) {
        event.preventDefault(); event.target.click();
      }
    };
    const submit = (event) => {
      event.preventDefault();
      window.alert('Preview only: your information has not been submitted.');
    };
    document.addEventListener('click', click);
    document.addEventListener('keydown', keydown);
    document.addEventListener('submit', submit);
    return () => {
      document.removeEventListener('click', click);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('submit', submit);
    };
  }, []);
  return null;
}
