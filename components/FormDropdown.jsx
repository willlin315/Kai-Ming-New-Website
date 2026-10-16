export default function FormDropdown({ field, attributes }) {
  return <select
    id={attributes.id}
    name={field.name}
    className="km-form-dropdown"
    aria-label={field.label}
    aria-labelledby={attributes['aria-labelledby']}
    required={field.required}
    disabled={field.readOnly}
    defaultValue={field.defaultValue}
    data-source-field-id={field.id}>
    <option value="">{field.placeholder || 'Select'}</option>
    {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>;
}
