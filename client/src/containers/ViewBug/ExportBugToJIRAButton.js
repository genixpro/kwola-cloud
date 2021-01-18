import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import axios from "axios";
import 'plyr/dist/plyr.css'
import "./index.scss";
import LoaderButton from "../../components/LoaderButton";
import NoJiraModal from './NoJiraModal';


class ExportBugToJIRAButton extends Component {
    state = {
        noJiraModalOpen: false
    };

    triggerExportToJIRA(evt)
    {
        evt.stopPropagation();
        return axios.get(`/application/${this.props.bug.applicationId}`).then((response) =>
        {
            const application = response.data;

            if (application.jiraAccessToken)
            {
                return axios.post(`/bugs/${this.state.bug._id}/export_to_jira`, {}).then((response) =>
                {

                }, (error) =>
                {
                    console.error("Error occurred while exporting the bug to JIRA.");
                });
            }
            else
            {
                this.setState({noJiraModalOpen: true});
                return Promise.reject();
            }

        }, (error) =>
        {
            console.error("Error occurred while exporting the bug to JIRA.");
        });
    }

    closeNoJiraModal(evt)
    {
        evt.stopPropagation();
        this.setState({noJiraModalOpen: false});
    }

    render()
    {
        return (
            <div>
                <LoaderButton onClick={(evt) => this.triggerExportToJIRA(evt)}
                              title={"Export Bug to JIRA"}
                              size={this.props.size || "medium"}
                              variant={this.props.variant || "extended"}
                              color={this.props.color || "primary"}
                              buttonType={this.props.buttonType || "fab"}
                              className={this.props.className}
                >
                    {this.props.children}
                </LoaderButton>

                <NoJiraModal
                    bug={this.props.bug}
                    open={this.state.noJiraModalOpen}
                    onClose={(evt) => this.closeNoJiraModal(evt)}
                />
            </div>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.ExportBugToJIRAButton} };
export default connect(mapStateToProps)(ExportBugToJIRAButton);

