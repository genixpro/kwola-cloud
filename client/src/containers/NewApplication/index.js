import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import Form from './formElements';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet from '../../components/utility/papersheet';
import { FullColumn } from '../../components/utility/rowColumn';
import { FormsComponentWrapper, FormsMainWrapper } from './forms.style';
import CodeViewer from '../codeViewer';
import axios from "axios";
import mixpanel from 'mixpanel-browser';
import Snackbar from '../../components/uielements/snackbar';

//injectTapEventPlugin();

const reducer = combineReducers({ form: reduxFormReducer });
const store = createStore(reducer);

export default class extends React.Component {
  state = {
    result: '',
    submitting:false,
    snackbar:false,
  };

  onSubmit(values)
  {

    this.setState({'submitting':true})
    var _hsq = window._hsq = window._hsq || [];
    axios.post("/application", {... values}).then((response) =>
    {

      if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
      {
        mixpanel.track("created-application");
        _hsq.push(["trackEvent", {id: "Created Application"}]);
        window.ga('send', 'event', "application", "create");
        this.setState({snackbar:true,snackbarText:'Application Created.',submitting:false})
      }


      this.props.history.push(`/app/dashboard/applications/${response.data.applicationId}`);
    },(error) =>
    {
      this.setState({snackbar:true,snackbarText:'There was an error, Application Not Created.',submitting:false})
    });
  };

  closeSnackbar(){
      this.setState({snackbar:false});
  }

  render()
  {
    const { result } = this.state;
    let loading = this.state.submitting
    const snackbar = <Snackbar

    />
    return (
      <Provider store={store}>
        <LayoutWrapper>
          <FormsMainWrapper>
            <FormsComponentWrapper className=" mateFormsComponent ">
              <FullColumn>
                <Papersheet>
                  <Form onSubmit={this.onSubmit.bind(this)} loading={loading}/>
                </Papersheet>
              </FullColumn>
            </FormsComponentWrapper>
          </FormsMainWrapper>
        </LayoutWrapper>
        <Snackbar 
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            onClick={() => this.closeSnackbar()}
            open={this.state.snackbar} 
            autoHideDuration={6000}
            timeout={6000}
            message={this.state.snackbarText ?? ""}
        />
      </Provider>
    );
  }
}

