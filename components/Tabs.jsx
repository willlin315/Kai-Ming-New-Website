'use client';
import { useRef, useState } from 'react';

const currentClass = 'TabsList2027980309--current';
const visibleClass = 'Tabscomponent1176390459--isVisible';
function withoutState(className = '') {
  return className.split(/\s+/).filter((name) => name !== currentClass && name !== visibleClass && !name.includes('---phase-')).join(' ');
}

export default function Tabs({ rootAttributes, menuAttributes, listAttributes, containerAttributes, items }) {
  const initial = Math.max(0, items.findIndex((item) => item.tabAttributes['aria-selected'] === 'true'));
  const [selected, setSelected] = useState(initial);
  const buttons = useRef([]);
  function onKeyDown(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }
  return <div {...rootAttributes} className={`${rootAttributes.className || ''} km-tabs`}>
    <div {...menuAttributes}>
      <div {...listAttributes} aria-label="Page information">
        {items.map((item, index) => <button {...item.tabAttributes}
          key={item.tabAttributes.id} type="button" role="tab"
          ref={(element) => { buttons.current[index] = element; }}
          className={`${withoutState(item.tabAttributes.className)} km-tab-button ${index === selected ? currentClass : ''}`}
          aria-selected={index === selected} aria-controls={`${item.tabAttributes.id}-panel`}
          tabIndex={index === selected ? 0 : -1}
          onClick={() => setSelected(index)} onKeyDown={(event) => onKeyDown(event, index)}>
          {item.label}
        </button>)}
      </div>
    </div>
    <div {...containerAttributes}>
      {items.map((item, index) => <div {...item.panelAttributes} key={item.tabAttributes.id}
        id={`${item.tabAttributes.id}-panel`} role="tabpanel"
        className={`${withoutState(item.panelAttributes.className)} ${index === selected ? visibleClass : ''}`}
        aria-labelledby={item.tabAttributes.id} aria-hidden={index !== selected}
        hidden={index !== selected}>
        {item.content}
      </div>)}
    </div>
  </div>;
}
