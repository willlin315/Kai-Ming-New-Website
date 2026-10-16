import {translate} from '../lib/i18n';
export default function FormDropdown({ field, attributes,locale='en' }) {
  return <select
    id={attributes.id}
    name={field.name}
    className="km-form-dropdown"
    aria-label={translate(field.label,locale)}
    aria-labelledby={attributes['aria-labelledby']}
    required={field.required}
    disabled={field.readOnly}
    defaultValue={field.defaultValue}
    data-source-field-id={field.id}>
    <option value="">{translate(field.placeholder || 'Select',locale)}</option>
    {field.options.map((option) => <option key={option.value} value={option.value}>{translate(option.label,locale)}</option>)}
  </select>;
}
