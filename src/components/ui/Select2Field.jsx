import { useEffect, useId, useRef } from 'react';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function displayText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return String(value.label ?? value.name ?? value.text ?? value.value ?? '');
  }
  return String(value);
}

function normalizeOption(opt) {
  if (opt == null) return null;
  if (typeof opt === 'string' || typeof opt === 'number') {
    const text = String(opt);
    return { value: text, label: text };
  }
  const label = displayText(opt.label ?? opt.name ?? opt.text ?? opt.value);
  const value = displayText(opt.value ?? opt.id ?? opt.code ?? label);
  if (!value && !label) return null;
  return { value: value || label, label: label || value };
}

/**
 * Select2 filter dropdown — selected value shows as a light-gray chip with red ×.
 */
export default function Select2Field({
  id,
  value = '',
  options = [],
  allLabel = 'All',
  ariaLabel,
  placeholder,
  onChange,
  width = '180px',
}) {
  const reactId = useId().replace(/:/g, '');
  const selectId = id || `filter-${reactId}`;
  const selectRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const syncingRef = useRef(false);
  const enhancedRef = useRef(false);
  onChangeRef.current = onChange;

  const normalizedOptions = options.map(normalizeOption).filter(Boolean);
  const optionsKey = normalizedOptions
    .map((opt) => `${opt.value}:${opt.label}`)
    .join('|');

  useEffect(() => {
    const el = selectRef.current;
    if (!el) return undefined;

    let cancelled = false;
    let $el = null;
    let $ = null;
    let $container = null;

    const emitChange = (next) => {
      if (syncingRef.current) return;
      onChangeRef.current?.(next == null ? '' : String(next));
    };

    const clearFilter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      if (!$el) return false;
      syncingRef.current = true;
      $el.val(null).trigger('change');
      try {
        $el.select2('close');
      } catch {
        /* ignore */
      }
      syncingRef.current = false;
      emitChange('');
      return false;
    };

    // Capture-phase: stop Select2 from opening; clear only on mousedown
    const blockOpenOnClear = (e) => {
      if (!e.target?.closest?.('.filter-chip-remove')) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      if (e.type === 'mousedown') {
        clearFilter(e);
      }
    };

    (async () => {
      try {
        const jqueryMod = await import('jquery');
        $ = jqueryMod.default;
        window.$ = window.jQuery = $;

        if (typeof $.fn.select2 !== 'function') {
          const select2Mod = await import('select2');
          const factory =
            typeof select2Mod.default === 'function'
              ? select2Mod.default
              : select2Mod.default?.default || select2Mod;
          if (typeof factory === 'function') {
            factory(window, $);
          }
        }

        if (cancelled || typeof $.fn.select2 !== 'function') return;

        $el = $(el);
        const placeholderText = placeholder || allLabel;

        $el.select2({
          width,
          placeholder: {
            id: '',
            text: placeholderText,
          },
          allowClear: false,
          minimumResultsForSearch: 6,
          dropdownParent: $(document.body),
          templateSelection: (state) => {
            if (!state.id) {
              return placeholderText;
            }
            const label = displayText(state.text) || displayText(state.id);
            // Return a DOM node (not a stringified object)
            const chip = document.createElement('span');
            chip.className = 'filter-chip';
            chip.innerHTML =
              `<span class="filter-chip-label">${escapeHtml(label)}</span>` +
              `<button type="button" class="filter-chip-remove" aria-label="Clear filter" title="Clear">×</button>`;
            return chip;
          },
          templateResult: (state) => {
            if (!state.id) return state.text;
            return displayText(state.text) || displayText(state.id);
          },
        });

        enhancedRef.current = true;
        $container = $el.next('.select2-container');

        const handleChange = () => {
          emitChange($el.val());
        };

        $el.on('change', handleChange);

        const containerEl = $container[0];
        if (containerEl) {
          containerEl.addEventListener('mousedown', blockOpenOnClear, true);
          containerEl.addEventListener('mouseup', blockOpenOnClear, true);
          containerEl.addEventListener('click', blockOpenOnClear, true);
        }

        syncingRef.current = true;
        if (value) {
          $el.val(String(value)).trigger('change');
        } else {
          $el.val(null).trigger('change');
        }
        syncingRef.current = false;

        el._select2Cleanup = () => {
          $el.off('change', handleChange);
          if (containerEl) {
            containerEl.removeEventListener('mousedown', blockOpenOnClear, true);
            containerEl.removeEventListener('mouseup', blockOpenOnClear, true);
            containerEl.removeEventListener('click', blockOpenOnClear, true);
          }
          try {
            if ($el.data('select2')) $el.select2('destroy');
          } catch {
            /* ignore */
          }
          enhancedRef.current = false;
        };
      } catch (err) {
        console.error('Select2 failed; using native select', err);
        enhancedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      if (typeof el._select2Cleanup === 'function') {
        el._select2Cleanup();
        el._select2Cleanup = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLabel, placeholder, width, optionsKey]);

  useEffect(() => {
    const el = selectRef.current;
    if (!el || !enhancedRef.current || !window.jQuery) return;

    const $el = window.jQuery(el);
    if (!$el.data('select2')) return;

    const current = value == null || value === '' ? null : String(value);
    const existing = $el.val();
    const existingNorm =
      existing == null || existing === '' ? null : String(existing);
    if (existingNorm === current) return;

    syncingRef.current = true;
    $el.val(current).trigger('change.select2');
    syncingRef.current = false;
  }, [value, optionsKey]);

  return (
    <select
      ref={selectRef}
      id={selectId}
      aria-label={ariaLabel}
      className="filter-select2"
      defaultValue={value || ''}
      onChange={(e) => {
        if (enhancedRef.current) return;
        onChange?.(e.target.value);
      }}
    >
      <option value="" />
      {normalizedOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
