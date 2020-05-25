import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet, {
  DemoWrapper,
} from '../../components/utility/papersheet';
import { Row, FullColumn } from '../../components/utility/rowColumn';
import applicationActions from "../../redux/ListApplications/actions";
import {connect} from "react-redux";
import {store} from "../../redux/store";

import BasicTable from './basicTable';
import {Root, Table} from "./materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow} from "../../components/uielements/table";
import Scrollbars from "../../components/utility/customScrollBar";
import axios from "axios";
import {Button} from "../UiElements/Button/button.style";
import Icon from "../../components/uielements/icon";

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
    applications: []
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
      this.loadApplications();
    })
  }


  render() {
    return (
      <LayoutWrapper>
        <Row>
          <FullColumn>
            <Papersheet>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>URL</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>

                      {(this.state.applications || []).map(application => {
                        return (
                            <TableRow key={application._id} hover={true}>
                              <TableCell onClick={() => this.props.history.push(`/app/dashboard/applications/${application._id}`)}>{application.name}</TableCell>
                              <TableCell onClick={() => this.props.history.push(`/app/dashboard/applications/${application._id}`)}>{application.url}</TableCell>
                              <TableCell>
                                <Button variant="extended" color="secondary" onClick={() => this.deleteApplication(application)}>
                                  <Icon>delete</Icon>
                                </Button>
                              </TableCell>
                            </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
            </Papersheet>
          </FullColumn>
        </Row>
      </LayoutWrapper>
    );
  }
}

export default withStyles(styles, { withTheme: true })(ListApplications);
