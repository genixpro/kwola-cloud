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
import stripePromise from "../../stripe";
import MonetizationOnIcon from '@material-ui/icons/MonetizationOn';
import axios from "axios";
import mixpanel from "mixpanel-browser";

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

    openBilling()
    {
        if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
        {
            var _hsq = window._hsq = window._hsq || [];
            mixpanel.track("open-billing");
            _hsq.push(["trackEvent", {id: "Open Billing"}]);
            window.ga('send', 'event', "billing", "view");
        }

        this.setState({ visible: false });
        axios.get(`/billing`).then((response) => {
            window.location.href = response.data.url;
        }, (error) =>
        {
           alert("Error opening billing URL: " + error.toString())
        });
    }

    openHelp()
    {
        // window.HubSpotConversations.widget.open();
        this.setState({ visible: false });
        window.location.href = "https://kwola.atlassian.net/servicedesk/customer/portal/2";
    }

    openFeedback()
    {
        window.HubSpotConversations.widget.open();
        this.setState({ visible: false });
    }

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
          <Link href="#" onClick={() => this.openBilling()} className="dropdownLink">
            <Icon>money-sharp</Icon>
            <IntlMessages id="topbar.billing" />
          </Link>
          <Link href="#" onClick={() => this.openFeedback()} className="dropdownLink">
            <Icon>feedback</Icon>
            <IntlMessages id="sidebar.feedback" />
          </Link>
          <Link href="#" onClick={() => this.openHelp()} className="dropdownLink">
            <Icon>help</Icon>
            <IntlMessages id="topbar.help" />
          </Link>
          <Link href="#" onClick={() => Auth.logout()} className="dropdownLink">
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
