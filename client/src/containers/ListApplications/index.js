import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet, {
  DemoWrapper,
} from '../../components/utility/papersheet';
import PageTitle from '../../components/utility/paperTitle';
import {ComponentTitleWrapper} from '../../components/utility/pageHeader/pageHeader.style.js';
import { Row, FullColumn } from '../../components/utility/rowColumn';
import applicationActions from "../../redux/ListApplications/actions";
import {connect} from "react-redux";
import {store} from "../../redux/store";
import BasicTable from './basicTable';
import {Root, Table} from "./materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow} from "../../components/uielements/table";
import Scrollbars from "../../components/utility/customScrollBar";
import axios from "axios";
import Button, {IconButton} from "../../components/uielements/button"; //from "../UiElements/Button/button.style";
import Dialog,{DialogActions, DialogContent, DialogTitle, DialogContentText   } from "../../components/uielements/dialogs";
import Icon from "../../components/uielements/icon";
import Snackbar from "../../components/uielements/snackbar";
import Tooltip from "../../components/uielements/tooltip";

const styles = theme => ({
  root: {
    width: '100%',
    marginTop: theme.spacing(3),
    overflowX: 'auto',
  },
  table: {
    minWidth: 700,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
});

class ListApplications extends Component
{
  state = {
    applications: [],
    dialog:false,
    snackbar:false,
  };

  componentDidMount()
  {
    this.loadApplications();
  }

  loadApplications()
  {
    axios.get("/application").then((response) =>
    {
      this.setState({applications: response.data.applications})
    })
  }

  deleteApplication(application)
  {
    axios.delete(`/application/${application._id}`).then((response) =>
    {
      this.setState({dialog:false,confirm:null,snackbar:true,snackbarText:"App: "+application.name+" Deleted"})
      this.loadApplications();
    })
  }

  

  
dialogComp = (application) => {
  var ConfirmText = <div>
            <DialogTitle id="alert-dialog-title">{application ? "Delete "+application.name : ''}?</DialogTitle>
              <DialogContent>
                <DialogContentText id="alert-dialog-description">
                  Are you sure? deleting the application will be permanent.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button variant="contained" onClick={()=>this.setState({dialog:false,confirm:null})}>
                  Cancel
                </Button>
                <Button variant="contained" color="secondary" onClick={()=>this.deleteApplication(application)} autoFocus>
                  Delete
                </Button>
              </DialogActions>
          </div>
    this.setState({dialog:true,confirm:ConfirmText})
  }

  render() {

    let dialog = <Dialog
        open={this.state.dialog}
        //onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
      {this.state.confirm ?? ""}
      </Dialog>

    let snackbar = <Snackbar 
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        onClick={() => this.setState({snackbar:false})}
        open={this.state.snackbar} 
        autoHideDuration={6000}
        timeout={6000}
        message={this.state.snackbarText ?? ""}
    />

    let apps = <TableBody>
      {(this.state.applications || []).map(application => {
        return (
            <TableRow key={application._id} hover={true}>
              <TableCell onClick={() => this.props.history.push(`/app/dashboard/applications/${application._id}`)}>{application.name}</TableCell>
              <TableCell onClick={() => this.props.history.push(`/app/dashboard/applications/${application._id}`)}>{application.url}</TableCell>
              <TableCell>
                <Button variant="extended" size="small" color="secondary" onClick={() => this.dialogComp(application)}>
                  <Icon>delete</Icon>
                </Button>
              </TableCell>
            </TableRow>
        );
      })}
    </TableBody>

    let tooltip = <Tooltip placement="right-end" title="Your Kwola Applications. Click an application to view more.">
                 <Icon color="primary" className="fontSizeSmall">help</Icon>
                </Tooltip> 
    return (
      <LayoutWrapper>
        <Row>
          <FullColumn>
            <Papersheet title="Applications" tooltip={tooltip} >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                {apps}
              </Table>
            </Papersheet>
          </FullColumn>
        </Row>
          {dialog}
          {snackbar}
      </LayoutWrapper>
    );
  }
}

export default withStyles(styles, { withTheme: true })(ListApplications);
