import { Plus, X } from 'lucide-react';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';

import type { ConditionNode, QueryOperator, QueryableField } from '../../../entity/query';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

interface Props {
  fields: QueryableField[];
  condition?: ConditionNode;
  onChange: (condition: ConditionNode) => void;
  onFieldSearch?: (searchTerm?: string) => Promise<QueryableField[]>;
}

export const ConditionEditorComponent = ({
  fields,
  condition,
  onChange,
  onFieldSearch,
}: Props): React.JSX.Element => {
  // States
  const [arrayValues, setArrayValues] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [localFields, setLocalFields] = useState<QueryableField[]>(fields);
  const [isLocalSearching, setIsLocalSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [fieldSearchText, setFieldSearchText] = useState('');
  const fieldInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Functions
  const debouncedSearchFields = async (searchTerm?: string) => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set loading state immediately
    setIsLocalSearching(true);

    // Create new timeout
    const timeoutId = setTimeout(async () => {
      if (onFieldSearch && searchTerm && searchTerm.length > 2) {
        try {
          const searchResults = await onFieldSearch(searchTerm);
          setLocalFields(searchResults);
        } catch (error) {
          console.error('Field search failed:', error);
          // Fallback to original fields if search fails
          setLocalFields(fields);
        }
      } else {
        // Reset to original fields if no search term or search term too short
        setLocalFields(fields);
      }
      setIsLocalSearching(false);
    }, 250);

    setSearchTimeout(timeoutId);
  };

  const getOrCreateField = (fieldName: string): QueryableField => {
    const existingField = fields.find((f) => f.name === fieldName);
    if (existingField) {
      return existingField;
    }

    // Create a default field object for unknown fields
    return {
      name: fieldName,
      type: 'string',
      operations: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'exists',
        'not_exists',
      ] as QueryOperator[],
      isCustom: true,
    };
  };

  const getDefaultValueForOperator = (
    operator: QueryOperator,
  ): string | number | boolean | string[] | null => {
    switch (operator) {
      case 'exists':
      case 'not_exists':
        return null;
      case 'in':
      case 'not_in':
        return [];
      default:
        return '';
    }
  };

  const operatorNeedsValue = (operator: QueryOperator): boolean => {
    return operator !== 'exists' && operator !== 'not_exists';
  };

  const operatorExpectsArray = (operator: QueryOperator): boolean => {
    return operator === 'in' || operator === 'not_in';
  };

  const isTimestampField = (fieldName: string): boolean => {
    return fieldName === 'timestamp' || fieldName === 'created_at';
  };

  const handleFieldChange = (fieldName: string) => {
    // Allow empty field names
    if (!fieldName || fieldName.trim() === '') {
      onChange({
        field: '',
        operator: 'equals',
        value: '',
      });
      return;
    }

    const field = getOrCreateField(fieldName);
    const currentOperator = condition?.operator;
    const currentValue = condition?.value;

    // Determine the operator to use:
    // 1. If current operator is compatible with new field, keep it
    // 2. Otherwise, use field's default operator
    let newOperator: QueryOperator;
    if (currentOperator && field.operations.includes(currentOperator)) {
      // Current operator is compatible with new field, preserve it
      newOperator = currentOperator;
    } else {
      // Need to pick a new operator
      // For "message" field, default to "contains" operator since it's more commonly used than "equals"
      newOperator =
        fieldName === 'message' && field.operations.includes('contains')
          ? 'contains'
          : field.operations[0];
    }

    // Preserve the current value if it exists and is compatible with the operator
    let newValue: string | number | boolean | string[] | null;

    // Only reset value if:
    // 1. There's no current value, OR
    // 2. The value type is incompatible with the operator
    const hasValue =
      currentValue !== null &&
      currentValue !== undefined &&
      currentValue !== '' &&
      !(Array.isArray(currentValue) && currentValue.length === 0);

    if (!hasValue) {
      // No current value, use default
      newValue = getDefaultValueForOperator(newOperator);
    } else {
      // Check if the value type is compatible with the operator
      if (!operatorNeedsValue(newOperator)) {
        // Operator doesn't need a value (exists/not_exists)
        newValue = null;
      } else if (operatorExpectsArray(newOperator) && !Array.isArray(currentValue)) {
        // Operator needs an array, but current value is not an array - convert it
        newValue = [String(currentValue)];
      } else if (!operatorExpectsArray(newOperator) && Array.isArray(currentValue)) {
        // Operator needs a single value, but current value is an array - use first element
        newValue = currentValue.length > 0 ? String(currentValue[0]) : '';
      } else {
        // Keep the current value as is
        newValue = currentValue;
      }
    }

    onChange({
      field: fieldName,
      operator: newOperator,
      value: newValue,
    });
  };

  const handleOperatorChange = (operator: QueryOperator) => {
    const currentValue = condition?.value;
    let newValue = currentValue;

    // Only reset value if we're switching to/from operators with incompatible value types
    if (!operatorNeedsValue(operator)) {
      // Switching to exists/not_exists - these don't need values
      newValue = null;
    } else if (operatorExpectsArray(operator) && !Array.isArray(currentValue)) {
      // Switching to in/not_in from a single value - convert to array if there's a value
      newValue = currentValue && currentValue !== '' ? [String(currentValue)] : [];
    } else if (!operatorExpectsArray(operator) && Array.isArray(currentValue)) {
      // Switching from in/not_in to a single value operator - use first array element or empty string
      newValue = currentValue.length > 0 ? String(currentValue[0]) : '';
    } else if (newValue === null || newValue === undefined) {
      // Only use default if there's no current value
      newValue = getDefaultValueForOperator(operator);
    }

    onChange({
      field: condition?.field || currentField?.name || '',
      operator,
      value: newValue,
    });
  };

  const handleValueChange = (value: string | number | boolean | string[] | null) => {
    onChange({
      field: condition?.field || currentField?.name || '',
      operator: currentOperator,
      value,
    });
  };

  const handleArrayValueAdd = () => {
    if (inputValue.trim()) {
      const newValues = [...arrayValues, inputValue.trim()];
      setArrayValues(newValues);
      setInputValue('');
      handleValueChange(newValues);
    }
  };

  const handleArrayValueRemove = (index: number) => {
    const newValues = arrayValues.filter((_, i) => i !== index);
    setArrayValues(newValues);
    handleValueChange(newValues);
  };

  const renderValueInput = () => {
    if (!operatorNeedsValue(currentOperator)) {
      return null;
    }

    // Array input for IN/NOT IN operators
    if (operatorExpectsArray(currentOperator)) {
      return (
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter value"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleArrayValueAdd();
                }
              }}
              className="flex-1 h-7 text-xs"
            />
            <button
              type="button"
              onClick={handleArrayValueAdd}
              className="rounded bg-primary px-2 py-1 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-3" />
            </button>
          </div>

          {arrayValues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {arrayValues.map((value, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                   className="border-border bg-muted text-foreground gap-1 pr-1"
                >
                  {value}
                  <button
                    type="button"
                    onClick={() => handleArrayValueRemove(index)}
                    className="ml-1 rounded-full hover:bg-accent p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Date input for timestamp fields and comparison operators
    if (
      isTimestampField(condition?.field || '') &&
      [
        'greater_than',
        'greater_or_equal',
        'less_than',
        'less_or_equal',
        'equals',
        'not_equals',
      ].includes(currentOperator)
    ) {
      const dateValue = condition?.value
        ? dayjs(condition.value as string).format('YYYY-MM-DDTHH:mm')
        : '';

      return (
        <Input
          type="datetime-local"
          value={dateValue}
          onChange={(e) => {
            const val = e.target.value;
            handleValueChange(val ? dayjs(val).toISOString() : '');
          }}
          placeholder="Select date and time"
          className="w-full h-7 text-xs"
        />
      );
    }

    // Regular text input for other cases
    return (
      <Input
        placeholder="Enter value"
        value={(condition?.value as string) || ''}
        onChange={(e) => handleValueChange(e.target.value)}
        className="h-7 text-xs"
      />
    );
  };

  // Calculated values
  const currentField =
    condition?.field && condition.field.trim() !== ''
      ? getOrCreateField(condition.field)
      : getOrCreateField('');
  const currentOperator = condition?.operator || currentField?.operations[0] || 'equals';

  const operatorDisplayNames: Record<QueryOperator, string> = {
    equals: 'equals',
    not_equals: 'not equals',
    contains: 'contains',
    not_contains: 'does not contain',
    in: 'is in',
    not_in: 'is not in',
    greater_than: 'greater than',
    greater_or_equal: 'greater than or equal',
    less_than: 'less than',
    less_or_equal: 'less than or equal',
    exists: 'exists',
    not_exists: 'does not exist',
  };

  const filteredFieldOptions = (() => {
    let options = localFields.map((field) => ({
      value: field.name,
      label: field.name,
      type: field.type,
    }));

    if (fieldSearchText) {
      const lowerSearch = fieldSearchText.toLowerCase();
      options = options.filter((opt) => opt.value.toLowerCase().includes(lowerSearch));
    }

    // If field input is empty, move "message" option to the top
    if (!fieldSearchText) {
      const messageIndex = options.findIndex((option) => option.value === 'message');
      if (messageIndex > 0) {
        const messageOption = options.splice(messageIndex, 1)[0];
        options.unshift(messageOption);
      }
    }

    return options;
  })();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        fieldInputRef.current &&
        !fieldInputRef.current.contains(event.target as Node)
      ) {
        setShowFieldDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Initialize array values if condition has array value
    if (
      operatorExpectsArray(currentOperator) &&
      Array.isArray(condition?.value) &&
      arrayValues.length === 0
    ) {
      setArrayValues(condition.value.map(String));
    }

    // Clear array values if we're not using an array operator
    if (!operatorExpectsArray(currentOperator) && arrayValues.length > 0) {
      setArrayValues([]);
    }
  }, [currentOperator, condition?.value, arrayValues.length]);

  // Update local fields when parent fields change
  useEffect(() => {
    setLocalFields(fields);
  }, [fields]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 items-center gap-2">
        {/* Field Selection */}
        <div className="col-span-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Field</label>
          <div className="relative">
            <Input
              ref={fieldInputRef}
              value={condition?.field || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFieldSearchText(val);
                setShowFieldDropdown(true);
                debouncedSearchFields(val);
              }}
              onFocus={() => setShowFieldDropdown(true)}
              placeholder="Type or select field name"
              className="w-full h-7 text-xs pr-7"
            />
            {isLocalSearching && (
              <div className="absolute top-1/2 right-2 -translate-y-1/2">
                <Spinner size="sm" />
              </div>
            )}
            {showFieldDropdown && filteredFieldOptions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg"
              >
                {filteredFieldOptions.map((option) => (
                  <div
                    key={option.value}
                    className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs hover:bg-accent"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFieldSearchText('');
                      setShowFieldDropdown(false);
                      handleFieldChange(option.value);
                    }}
                  >
                    <span>{option.label}</span>
                    <span className="text-muted-foreground">{option.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Operator Selection */}
        <div className="col-span-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Operator</label>
          <Select
            value={currentOperator}
            onValueChange={(val) => handleOperatorChange(val as QueryOperator)}
          >
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentField?.operations.map((op) => (
                <SelectItem key={op} value={op}>
                  {operatorDisplayNames[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value Input */}
        <div className="col-span-5">
          {operatorNeedsValue(currentOperator) && (
            <>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Value</label>
              {renderValueInput()}
            </>
          )}

          {!operatorNeedsValue(currentOperator) && (
            <div className="pt-4 text-xs text-muted-foreground">No value needed</div>
          )}
        </div>
      </div>

      {/* Field info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          <span className="font-medium">{currentField?.type}</span> field{' '}
          {currentField?.type === 'string' ? '(case-sensitive)' : ''}
        </div>
      </div>
    </div>
  );
};
