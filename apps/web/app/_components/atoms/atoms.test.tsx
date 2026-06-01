import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { IconName, Person } from '../../_types';
import { Avatar } from './Avatar';
import { Check } from './Check';
import { Icon } from './Icon';
import { Pill } from './Pill';
import { PriorityDot } from './PriorityDot';
import { Progress } from './Progress';
import { Toggle } from './Toggle';

const person: Person = {
  id: 1,
  name: 'Ada Lovelace',
  initials: 'AL',
  color: '#4a76b8',
};

describe('Avatar', () => {
  it('renders a placeholder when there is no person', () => {
    render(<Avatar person={null} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders initials when the person has no photo', () => {
    render(<Avatar person={person} />);
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('renders an absolute photo url unchanged', () => {
    render(<Avatar person={{ ...person, photo: 'https://img/x.png' }} />);
    const img = document.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://img/x.png');
  });

  it('prefixes a relative photo path with the API url', () => {
    render(<Avatar person={{ ...person, photo: '/uploads/x.png' }} />);
    const img = document.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(/\/uploads\/x\.png$/);
    expect(img.getAttribute('src')).toMatch(/^https?:\/\//);
  });
});

describe('Pill', () => {
  it('renders its children', () => {
    render(<Pill>hello</Pill>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it.each(['neutral', 'accent', 'danger', 'ghost'] as const)(
    'renders the %s tone',
    (tone) => {
      render(<Pill tone={tone}>x</Pill>);
      expect(screen.getByText('x')).toBeInTheDocument();
    },
  );

  it('supports the medium size', () => {
    render(<Pill size="md">m</Pill>);
    expect(screen.getByText('m')).toBeInTheDocument();
  });
});

describe('PriorityDot', () => {
  it.each(['low', 'med', 'high'] as const)('renders for %s priority', (priority) => {
    const { container } = render(<PriorityDot priority={priority} />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });
});

describe('Progress', () => {
  it('shows 0 percent when total is zero', () => {
    render(<Progress done={0} total={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('rounds the completed percentage', () => {
    render(<Progress done={1} total={3} />);
    expect(screen.getByText('33')).toBeInTheDocument();
  });

  it('shows 100 when everything is done', () => {
    render(<Progress done={4} total={4} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});

describe('Check', () => {
  it('reflects the checked state via aria', () => {
    render(<Check checked onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles to the opposite value on click', () => {
    const onChange = vi.fn();
    render(<Check checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Toggle', () => {
  it('reflects its value via aria', () => {
    render(<Toggle value onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('flips its value on click', () => {
    const onChange = vi.fn();
    render(<Toggle value onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('Icon', () => {
  const names: IconName[] = [
    'close', 'plus', 'more', 'search', 'filter', 'flame', 'calendar', 'tag',
    'user', 'chevron', 'chart', 'back', 'gear', 'list', 'columns', 'tabs',
    'stacked', 'arrow', 'trash',
  ];

  it.each(names)('renders an svg for "%s"', (name) => {
    const { container } = render(<Icon name={name} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('returns nothing for an unknown name', () => {
    const { container } = render(<Icon name={'nope' as IconName} />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
