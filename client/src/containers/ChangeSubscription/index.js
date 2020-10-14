import AppBar from '../../components/uielements/appbar';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import React, { Component } from 'react';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import Tabs, { Tab } from '../../components/uielements/tabs';
import axios from "axios";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import ActionsConfiguration from "../NewTestingRun/ActionsConfiguration";
import AutologinCredentials from "../NewTestingRun/AutologinCredentials";
import ErrorsConfiguration from "../NewTestingRun/ErrorsConfiguration";
import PathWhitelistConfiguration from "../NewTestingRun/PathWhitelistConfiguration";
import SizeOfRun from "../NewTestingRun/SizeOfRun";
import RecurringTestingTriggerOptions from "../NewRecurringTestingTrigger/RecurringTestingTriggerOptions";
import _ from "underscore";
import PackageSelector from "../NewApplicationWizard/PackageSelector";
import {Button} from "../UiElements/Button/button.style";
import NavigateBeforeIcon from "@material-ui/icons/NavigateBefore";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import "./ChangeSubscription.scss";
import {Link} from "react-router-dom";
import Promise from "bluebird";
import LoaderButton from "../../components/LoaderButton";
import CircularProgress from "../../components/uielements/circularProgress";

/**
 *
 */
class ChangeSubscription extends Component {
    state = {
        isCancelling: false
    };

    componentDidMount()
    {
        axios.get(`/application/${this.getApplicationId()}`).then((response) =>
        {
            this.setState({
                application: response.data,
                startPackage: response.data.package
            });
        });
    }

    changePackage(newPackage)
    {
        const application = this.state.application;
        application.package = newPackage;
        this.setState({application: application})
    }

    savePackageClicked()
    {
        return this.saveApplication().then(() =>
        {
            this.props.history.push(`/app/dashboard/applications/${this.getApplicationId()}`)

            return Promise.fulfilled();
        });
    }

    saveApplication()
    {
        return axios.post(`/application/${this.getApplicationId()}`, this.state.application).then((response) =>
        {
            // this.setState({application: response.data.application})
        });
    }

    cancelPackage()
    {
        const application = this.state.application;
        application.package = null;
        this.setState({application: application, isCancelling: true}, () => {

            return this.saveApplication().then( () =>
            {
                setTimeout(() =>
                {
                    this.setState({isCancelling: false});

                    this.props.history.push(`/app/dashboard/applications/${this.getApplicationId()}`)
                }, 500);
            }, () =>
            {
                this.setState({isCancelling: false});
            });
        })
    }

    
    getApplicationId()
    {
        return this.props.match.params.id;
    }


    render() {
        const { result } = this.state;

        if (!this.state.application)
        {
            return <LayoutWrapper />;
        }

        return (
            <LayoutWrapper>
                <FullColumn>
                    <Row>
                        <TwoThirdColumn>
                            <div>
                                <Papersheet title={`Change Subscription`}>
                                    <PackageSelector
                                        hideOneTime={true}
                                        selectedPackage={this.state.application.package}
                                        onChangePackage={(name) => this.changePackage(name)}
                                    />
                                    {
                                        this.state.startPackage === "monthly" ?
                                            <span>
                                                <br/>
                                                <br/>
                                                <br/>
                                                <br/>
                                                If you would like to cancel your subscription, click here:&nbsp;
                                                <span className={"cancel-subscription-link"} onClick={() => this.cancelPackage()}>
                                                    Cancel your Subscription
                                                </span>

                                                {
                                                    this.state.isCancelling ?
                                                        <CircularProgress size={24} color="blue"/> : null
                                                }
                                            </span>  : null
                                    }
                                    <br/>
                                    <br/>
                                    <div className={"save-package-button-wrapper"}>
                                        {
                                            this.state.application.package !== this.state.startPackage ?
                                                <LoaderButton
                                                        title={"Save Subscription"}
                                                        className={"save-package-button"}
                                                        onClick={(event) => this.savePackageClicked(event)}>
                                                    <span>Save Subscription Choice</span>
                                                </LoaderButton> : null
                                        }
                                        {
                                            this.state.application.package === this.state.startPackage ?
                                                <Link to={`/app/dashboard/applications/${this.props.match.params.id}`}>
                                                    <Button variant="contained"
                                                            size="medium"
                                                            color={"default"}
                                                            title={"Cancel"}
                                                            className={"cancel-button"}>
                                                        <span>Cancel</span>
                                                    </Button>
                                                </Link>: null
                                        }
                                    </div>
                                </Papersheet>
                            </div>
                        </TwoThirdColumn>
                    </Row>
                </FullColumn>
            </LayoutWrapper>

        );
    }
}

const mapStateToProps = (state) => {return { ...state.ChangeSubscription} };
export default connect(mapStateToProps)(ChangeSubscription);

