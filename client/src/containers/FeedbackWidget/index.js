import React, {Component} from "react";
import {Column, Row} from "../../components/utility/rowColumn";
import {FormControlLabel, FormGroup} from "../../components/uielements/form";
import Checkbox from "../../components/uielements/checkbox";
import TextField from "../../components/uielements/textfield";
import {connect} from "react-redux";
import {Button} from "../UiElements/Button/button.style";
import ThumbUpIcon from '@material-ui/icons/ThumbUp';
import ThumbDownIcon from '@material-ui/icons/ThumbDown';
import SendIcon from '@material-ui/icons/Send';
import axios from "axios";
import Promise from "bluebird";
import LoaderButton from "../../components/LoaderButton";


class FeedbackWidget extends Component {
    defaultState = {
        showFeedbackText: false,
        valence: null,
        writtenFeedback: "",
        feedbackSubmissionId: null
    }

    state = this.defaultState

    thumbsUpClicked()
    {
        this.setState({
            "showFeedbackText": true,
            "valence": "good"
        }, () =>
        {
            this.sendFeedbackData();
            this.focusWrittenFeedbackInput()
        });


    }

    thumbsDownClicked()
    {
        this.setState({
            "showFeedbackText": true,
            "valence": "bad"
        }, () =>
        {
            this.sendFeedbackData();
            this.focusWrittenFeedbackInput()
        });
    }

    focusWrittenFeedbackInput()
    {
        const elem = document.getElementById("feedback-text-input");
        if (elem)
        {
            elem.focus();
        }
    }

    writtenFeedbackChanged(newValue)
    {
        this.setState({"writtenFeedback": newValue});
    }

    sendFeedbackData()
    {
        const feedbackData = {
            applicationId: this.props.applicationId,
            testingRunId: this.props.testingRunId,
            creationDate: new Date().toISOString(),
            valence: this.state.valence,
            text: this.state.writtenFeedback
        };

        if (this.state.feedbackSubmissionId)
        {
            return axios.post(`/feedback_submission/${this.state.feedbackSubmissionId}`, feedbackData).then((response) =>
            {
                return response;
            });
        }
        else
        {
            return axios.post(`/feedback_submission`, feedbackData).then((response) =>
            {
                this.setState({"feedbackSubmissionId": response.data.feedbackSubmissionId});
                return response;
            });
        }
    }


    sendWrittenFeedback()
    {
        return this.sendFeedbackData().then((response) =>
        {
            setTimeout(() =>
            {
                this.setState(this.defaultState);
            }, 2000);
            return response;
        }, (error) =>
        {
            console.error("Error occurred while submitting feedback!");
            return Promise.rejected();
        });
    }

    feedbackInputKeyPress(evt)
    {
        if(evt.keyCode === 13)
        {
            const feedbackButton = document.getElementById("send-feedback-button");
            feedbackButton.click();
        }
    }

    render() {
        return <div style={{
            "display": "flex",
            "flexDirection": "row"
        }}>
            {
                !this.state.showFeedbackText ?
                    <div>
                        <Button
                            title={"Thumbs Up - I liked these results"}
                            variant="extended"
                            color="primary"
                            style={{"backgroundColor": "#08bd08"}}
                            onClick={() => this.thumbsUpClicked()}
                        >
                            <ThumbUpIcon/>
                        </Button>
                    </div> : null
            }
            {
                !this.state.showFeedbackText ?
                    <div>
                        <Button
                            title={"Thumbs Down - I did not like these results"}
                            variant="extended"
                            color="primary"
                            style={{"backgroundColor": "#c70505"}}
                            onClick={() => this.thumbsDownClicked()}
                        >
                            <ThumbDownIcon/>
                        </Button>
                    </div> : null
            }
                <br/>
                {
                    this.state.showFeedbackText ?
                        <TextField
                            id="feedback-text-input"
                            label="Written feedback"
                            type={"text"}
                            value={this.state.writtenFeedback}
                            style={{"flexGrow": "1"}}
                            onChange={(event) => this.writtenFeedbackChanged(event.target.value)}
                            onKeyDown={(evt) => this.feedbackInputKeyPress(evt)}
                            margin="normal"
                        /> : null
                }
                <br/>
                {
                    this.state.showFeedbackText ?
                        <LoaderButton id={"send-feedback-button"} color="primary" title={"Send my Feedback"} onClick={() => this.sendWrittenFeedback()}>
                            <SendIcon/>
                        </LoaderButton> : null
                }
        </div>;
    }
}


const mapStateToProps = (state) => {return { ...state.FeedbackWidget} };
export default connect(mapStateToProps)(FeedbackWidget);

