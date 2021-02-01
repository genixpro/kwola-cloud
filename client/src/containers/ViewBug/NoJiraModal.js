import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import {connect, Provider} from 'react-redux';
import axios from "axios";
import Button, {IconButton} from "../../components/uielements/button";
import 'plyr/dist/plyr.css'
import {Check, Forward} from "@material-ui/icons";
import "./index.scss";
import Modal from '../../components/uielements/modals';

class NoJiraModal extends Component
{
    render()
    {
        return (
            <Modal
                aria-labelledby="no-jira-configuration-modal-title"
                aria-describedby="no-jira-configuration-modal-description"
                open={this.props.open}
                onClose={this.props.onClose}
            >
                <div className={"no-jira-modal"}>
                    <h4 id="no-jira-configuration-modal-title">
                        No JIRA Setup
                    </h4>

                    <p id="no-jira-configuration-modal-description">
                        There appears to be no JIRA integration currently setup in your account.
                    </p>

                    <Link to={`/app/dashboard/applications/${this.props.bug.applicationId}/integrations`}
                          onClick={(evt) => evt.stopPropagation()}>
                        <Button variant="contained"
                                color={"primary"}
                                title={"Go To Integrations"}
                        >
                            Configure JIRA Integration
                            <Forward />
                        </Button>
                    </Link>
                </div>
            </Modal>

        );
    }
}

const mapStateToProps = (state) => {return { ...state.NoJiraModal} };
export default connect(mapStateToProps)(NoJiraModal);

