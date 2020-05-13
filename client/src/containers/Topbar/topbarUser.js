import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import IntlMessages from '../../components/utility/intlMessages';
import TopbarDropdownWrapper from './topbarDropdown.style';
import Auth from "../../helpers/auth0/index"
import AccountBox from '@material-ui/icons/AccountBox';
import {
  IconButtons,
  TopbarDropdown,
  UserInformation,
  SettingsList,
  Icon,
} from './topbarDropdown.style';
import Image from '../../images/user.jpg';

class TopbarUser extends Component {
  state = {
    visible: false,
    anchorEl: null,
  };
  hide = () => {
    this.setState({ visible: false });
  };
  handleVisibleChange = () => {
    this.setState({
      visible: !this.state.visible,
      anchorEl: findDOMNode(this.button),
    });
  };
  render() {
    const userData = Auth.getUserInfo();

    const content = (
      <TopbarDropdown>
        <UserInformation>
          {/*<div className="userImage">*/}
          {/*  <img src={Image} alt="user" />*/}
          {/*</div>*/}

          <div className="userDetails">
            <h3>{userData.name}</h3>
            <p>{userData.email}</p>
          </div>
        </UserInformation>

        <SettingsList>
          <a href="#!" className="dropdownLink">
            <Icon>settings</Icon>
            <IntlMessages id="themeSwitcher.settings" />
          </a>
          <a href="#!" className="dropdownLink">
            <Icon>help</Icon>
            <IntlMessages id="sidebar.feedback" />
          </a>
          <a href="#!" className="dropdownLink">
            <Icon>feedback</Icon>
            <IntlMessages id="topbar.help" />
          </a>
          <Link to="/logout" onClick={this.props.logout} className="dropdownLink">
            <Icon>input</Icon>
            <IntlMessages id="topbar.logout" />
          </Link>
        </SettingsList>
      </TopbarDropdown>
    );
    return (
      <div id="topbarUserIcon">
        <IconButtons
          ref={node => {
            this.button = node;
          }}
          onClick={this.handleVisibleChange}
        >
          <div className="userImgWrapper">
              <AccountBox style={{ fontSize: 32 }} />
          </div>
        </IconButtons>

        <TopbarDropdownWrapper
          open={this.state.visible}
          anchorEl={this.state.anchorEl}
          onClose={this.hide}
          // marginThreshold={66}
          className="userPopover"
          anchorOrigin={{
            horizontal: 'right',
            vertical: 'top',
          }}
          transformOrigin={{
            horizontal: 'right',
            vertical: 'bottom',
          }}
        >
          {content}
        </TopbarDropdownWrapper>
      </div>
    );
  }
}

export default connect(
  state => ({
    ...state.App,
    customizedTheme: state.ThemeSwitcher.topbarTheme,
  }),
  {

  }
)(TopbarUser);
