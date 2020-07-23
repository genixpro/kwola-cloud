import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/uielements/button';
import signinImg from '../../../images/signin.svg';
import TextField from '../../../components/uielements/textfield';
import IntlMessages from '../../../components/utility/intlMessages';
import SignInStyleWrapper from './confirmEmail.style';
import Auth0 from '../../../helpers/auth0';

class ConfirmEmail extends Component {
  render() {
    return (
      <SignInStyleWrapper className="mateSignInPage">
        <div className="mateSignInPageImgPart">
          <div className="mateSignInPageImg">
            <img src={signinImg} alt="Kiwi standing on oval" />
          </div>
        </div>

        <div className="mateSignInPageContent">
          <div className="mateSignInPageGreet">
            <h1>
              Confirm Email
            </h1>
            <p>
              It appears you have yet to confirm your email.  Before we can give you access to kwola, please confirm your email address
              is correct.  check your email for our verification link.
            </p>
            Go to{' '}
            <Link to="#" onClick={() => Auth0.logout()} >
              <Button color="primary">Dashboard</Button>
            </Link>
          </div>
          <div className="mateSignInPageForm">
            {/*<div className="mateInputWrapper">
              <TextField label="Enter your email" margin="normal" />
            </div>
            <div className="mateLoginSubmit">
              <Button type="button">
                <IntlMessages id="page.sendRequest" />
              </Button>
            </div>
          */}
          </div>

          <p className="homeRedirection">
            
            Or Sign Out and try another account{' '}
            <Link to="#" onClick={() => Auth0.logout()} >
              <Button color="primary">Logout</Button>
            </Link>
          </p>
        </div>
      </SignInStyleWrapper>
    );
  }
}

export default ConfirmEmail;
