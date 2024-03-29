import React from 'react';
import { Field, reduxForm } from 'redux-form';
import {
  FormControl,
  FormHelperText,
  FormControlLabel,
} from '../../components/uielements/form';
import Button from '../../components/uielements/button';
import TextField from '../../components/uielements/textfield';
import CircularProgress from '../../components/uielements/circularProgress';
import Radio, { RadioGroup } from '../../components/uielements/radio';
import Checkbox from '../../components/uielements/checkbox';
import asyncValidate from './asyncValidate';
import validate from './validate';

const renderTextField = ({
  input,
  label,

  meta: { touched, error },
  ...custom
}) => {
  return (
    <FormControl value={input.value}>
      <TextField
        error={touched && error ? true : false}
        label={label}
        {...input}
        {...custom}
      />
      {touched && error ? <FormHelperText>{error}</FormHelperText> : ''}
    </FormControl>
  );
};
const renderPassword = ({
  input,
  label,

  meta: { touched, error },
  ...custom
}) => {
  return (
    <FormControl value={input.value}>
      <TextField
        error={touched && error ? true : false}
        type="password"
        label={label}
        {...input}
        {...custom}
      />
      {touched && error ? <FormHelperText>{error}</FormHelperText> : ''}
    </FormControl>
  );
};

const renderRadioGroup = ({ input, ...rest }) => (
  <RadioGroup
    {...input}
    {...rest}
    onChange={(event, value) => input.onChange(value)}
  />
);
const renderToggle = ({ label, input, meta: { touched, error }, ...rest }) => (
  <FormControl value={input.value}>
    <FormControlLabel
      control={
        <Checkbox
          checked={input.value ? true : false}
          onChange={input.onChange}
          color="primary"
        />
      }
      label={label}
    />
    {touched && error ? <FormHelperText>{error}</FormHelperText> : ''}
  </FormControl>
);

const MaterialUiForm = ({
  handleSubmit,
  onSubmit,
  handleSubmitFailed,
  pristine,
  reset,
  submitting,
  submitFailed,
  loading,
}) => {
  return (
    <form onSubmit={handleSubmit} className="mainFormsWrapper">
      <div className="mainFormsInfoWrapper">
        <div className="mainFormsInfoField">
          <Field
            name="name"
            component={renderTextField}
            label="Name"
          />
        </div>
        <div className="mainFormsInfoField">
          <Field
            name="url"
            component={renderTextField}
            label="Login Page URL"
          />
        </div>
      </div>
      <div className="mateFormsFooter">
        <div className="mateFormsChecBoxList">
          <Field
            name="agreedTerms"
            component={renderToggle}
            label="I agree to have my frontend tested"
          />
        </div>

        <div className="mateFormsSubmit">
          <Button
            type="submit"
            className={pristine || submitting ? '' : 'mateFormsSubmitBtn'}
            disabled={pristine || submitting}
          >
            Submit 
            {loading ? <CircularProgress size={18} color="secondary"/> : <div></div>}  
          </Button>
          
          <Button
            color="secondary"
            className="mateFormsClearBtn"
            disabled={pristine || submitting}
            onClick={() => {
              reset();
              //onSubmit();
            }}
          >
            Clear Values
          </Button>
        </div>
      </div>
    </form>
  );
};

export default reduxForm({
  form: 'form',
  validate,
  asyncValidate,
})(MaterialUiForm);
