import AddIcon from '@material-ui/icons/Add';
import Checkbox from '../../components/uielements/checkbox';
import DeleteIcon from '@material-ui/icons/Delete';
import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import Snackbar from '../../components/uielements/snackbar';
import Typography from '../../components/uielements/typography';
import Modal from '../../components/uielements/modals';
import { Button } from "../UiElements/Button/button.style";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import {
    FormGroup,
    FormControlLabel,
} from '../../components/uielements/form';
import Papersheet from "../../components/utility/papersheet";


class PathWhitelistConfiguration extends Component {
    state = {
        enablePathWhitelist: false,
        pathRegexes: [],
        testerOpen: {},
        testURL: ""
    }

    updateParent()
    {
        if (!this.props.onChange)
        {
            return null;
        }

        if (this.state.enablePathWhitelist)
        {
            this.props.onChange({
                enablePathWhitelist: this.state.enablePathWhitelist,
                urlWhitelistRegexes: this.state.pathRegexes.map((pattern, index) =>
                {
                    if (!this.isRegexValid(index))
                    {
                        return ".*"
                    }
                    else
                    {
                        return pattern;
                    }
                })
            })
        }
        else
        {
            this.props.onChange({
                enablePathWhitelist: this.state.enablePathWhitelist,
                urlWhitelistRegexes: []
            })
        }
    }


    componentDidMount()
    {
        if (this.props.defaultRunConfiguration)
        {
            const config = this.props.defaultRunConfiguration;
            this.setState({
                enablePathWhitelist: config.enablePathWhitelist,
                pathRegexes: config.urlWhitelistRegexes
            });
        }
    }


    togglePathWhitelist()
    {
        if (this.props.disabled)
        {
            return;
        }

        this.setState({enablePathWhitelist: !this.state.enablePathWhitelist}, () => this.updateParent());
    }


    addNewPathRegex()
    {
        if (this.props.disabled)
        {
            return;
        }

        const pathRegexes = this.state.pathRegexes;
        const testerOpen = this.state.testerOpen;
        pathRegexes.push(".*")
        testerOpen[pathRegexes.length-1] = false;
        this.setState({pathRegexes}, () => this.updateParent())
    }


    changePathRegex(index, newValue)
    {
        if (this.props.disabled)
        {
            return;
        }

        const pathRegexes = this.state.pathRegexes;
        pathRegexes[index] = newValue;
        this.setState({pathRegexes}, () => this.updateParent())
    }

    changeTestURL(newValue)
    {
        this.setState({testURL: newValue})
    }

    removePathRegex(index)
    {
        if (this.props.disabled)
        {
            return;
        }

        const pathRegexes = this.state.pathRegexes;
        pathRegexes.splice(index, 1);
        this.setState({pathRegexes}, () => this.updateParent())
    }

    toggleRegexTester(index)
    {
        if (!this.state.testURL)
        {
            this.setState({testURL: this.props.application.url});
        }

        const testerOpen = this.state.testerOpen;
        testerOpen[index] = !testerOpen[index];
        this.setState({testerOpen: testerOpen});
    }

    getModalStyle()
    {
        const top = 50 ;
        const left = 50;

        return {
            position: 'absolute',
            width: 16 * 50,
            top: `${top}%`,
            left: `${left}%`,
            transform: `translate(-${top}%, -${left}%)`,
            border: '1px solid #e5e5e5',
            backgroundColor: '#fff',
            boxShadow: '0 5px 15px rgba(0, 0, 0, .5)',
            padding: 8 * 4,
        };
    }

    getRegexpMatchingCharacters(index)
    {
        const testURLIsCharMatch = [];
        for(let char of this.state.testURL)
        {
            testURLIsCharMatch.push({
                "char": char,
                "match": false
            });
        }

        if (!this.isRegexValid(index))
        {
            return testURLIsCharMatch;
        }

        const pattern = new RegExp(this.state.pathRegexes[index], "g");
        const matches = [...this.state.testURL.matchAll(pattern)];
        if (matches.length > 0) {
            for (let match of matches) {
                let startIndex = this.state.testURL.indexOf(match[0]);
                for (let c = startIndex; c < (startIndex + match[0].length); c += 1) {
                    testURLIsCharMatch[c].match = true;
                }
            }
        }

        return testURLIsCharMatch;
    }

    isRegexValid(index)
    {
        if (!this.state.pathRegexes[index])
        {
            return false;
        }
        try
        {
            new RegExp(this.state.pathRegexes[index]);
            return true;
        }
        catch (e)
        {
            return false;
        }
    }


    testRegexp(index)
    {
        if (!this.isRegexValid(index))
        {
            return false;
        }

        const pattern = new RegExp(this.state.pathRegexes[index]);
        return pattern.test(this.state.testURL);
    }

    render() {
        return <Papersheet
            title={`Path Restriction`}
            subtitle={``}
        >
            <Row>
                <Column xs={this.props.hideHelp ? 12 : 9}>
                    <FormGroup row>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enablePathWhitelist}
                                    onChange={() => this.togglePathWhitelist()}
                                    value="autologin"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable whitelist of target paths / URLs?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                    </FormGroup>
                    {
                        this.state.enablePathWhitelist ?
                            <div>
                                <br/>
                                <br/>
                                <br/>
                                <br/>
                                {
                                    this.state.pathRegexes.map((pathRegexString, pathRegexIndex) =>
                                    {
                                        return <div key={pathRegexIndex}>
                                            <TextField
                                                id={`regex-string-${pathRegexIndex}`}
                                                label={`Path Regex ${pathRegexIndex + 1}`}
                                                type={"text"}
                                                value={pathRegexString}
                                                onChange={(event) => this.changePathRegex(pathRegexIndex, event.target.value)}
                                                margin="normal"
                                            />

                                            <Button variant="extended" color={"secondary"} onClick={() => this.removePathRegex(pathRegexIndex)}>
                                                <DeleteIcon />
                                            </Button>
                                            <Button variant="extended" color={"primary"} onClick={() => this.toggleRegexTester(pathRegexIndex)}>
                                                Test
                                            </Button>
                                            <Modal
                                                aria-labelledby={"regex-tester-modal-title"}
                                                aria-describedby="regex-tester-modal-description"
                                                open={this.state.testerOpen[pathRegexIndex]}
                                                onClose={() => this.toggleRegexTester(pathRegexIndex)}
                                            >
                                                <div style={this.getModalStyle()}>
                                                    <Typography variant="h6" id="modal-title">
                                                        Regular Expression Tester
                                                    </Typography>
                                                    <Typography variant="subtitle1" id="regex-tester-modal-description">
                                                        <TextField
                                                            id={`regex-string-${pathRegexIndex}-2`}
                                                            label={`Regex String`}
                                                            style={{"width": "100%"}}
                                                            type={"text"}
                                                            value={pathRegexString}
                                                            onChange={(event) => this.changePathRegex(pathRegexIndex, event.target.value)}
                                                            margin="normal"
                                                        />
                                                        <br/>
                                                        <TextField
                                                            id={`regex-test-url-${pathRegexIndex}`}
                                                            label={`Test URL`}
                                                            style={{"width": "100%"}}
                                                            type={"text"}
                                                            value={this.state.testURL}
                                                            onChange={(event) => this.changeTestURL(event.target.value)}
                                                            margin="normal"
                                                        />
                                                        <br/>
                                                        <br/>
                                                        <div>
                                                            <span>Match:</span>
                                                            {
                                                                this.getRegexpMatchingCharacters(pathRegexIndex).map((char, charIndex) =>
                                                                {
                                                                    const style = {};
                                                                    if(char.match)
                                                                    {
                                                                        style["backgroundColor"] = "aqua";
                                                                    }
                                                                    return <span style={style} key={charIndex}>{char.char}</span>
                                                                })
                                                            }
                                                        </div>
                                                        <div>
                                                            <span>Regex Valid?&nbsp;&nbsp;</span>
                                                            <span>{this.isRegexValid(pathRegexIndex).toString()}</span>
                                                        </div>
                                                        <div>
                                                            <span>URL Allowed?&nbsp;&nbsp;</span>
                                                            <span>{this.testRegexp(pathRegexIndex).toString()}</span>
                                                        </div>
                                                    </Typography>
                                                </div>
                                            </Modal>
                                        </div>;
                                    })
                                }
                                {
                                    <Button variant="extended" color={"primary"} onClick={() => this.addNewPathRegex()}>
                                        Add a Path Regex
                                        <AddIcon className="rightIcon"></AddIcon>
                                    </Button>
                                }
                            </div> : null
                    }
                </Column>
                {
                    !this.props.hideHelp ?
                        <Column xs={3}>
                            <p>Select whether you want to keep Kwola constrained within URL's that match your provided regexes.</p>
                        </Column> : null
                }
            </Row>
        </Papersheet>;
    }
}


const mapStateToProps = (state) => {return { ...state.PathWhitelistConfiguration} };
export default connect(mapStateToProps)(PathWhitelistConfiguration);

