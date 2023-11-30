// const express = require ('express');
// const bodyParcer = require ('body-parser');
// const cors = require ('cors');
// const sql = require ('mssql/msnodesqlv8');
// const axios = require('axios');

// const app = express();
// app.use(bodyParcer.json());
// app.use(cors());
// // app.use(express.static(path.join(__dirname , "./frontend/build")));
// // app.get ("*", (req,res) => {
// //     res.sendFile(path.join(__dirname , "./frontend/build/index.html"))
// // });

// const config = {
//     server:'RAJDEEP-PC\\SQLEXPRESS',
//     database:'GapData1',
//     driver:'msnodesqlv8',
//     options:{
//         trustedConnection: true,
//     },
// };

// sql.connect(config , (err)=>{
//     if(err){
//         console.log('Error:',err);
//     }else{
//         console.log('connected')
//     }
// });

// // Start the server
// const PORT = process.env.PORT || 8090;
// app.listen(PORT, () => {
//   console.log(`Server is running on PORT ${PORT}`);
// });


const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sql = require('mssql');
const axios = require('axios');
require('events');

const app = express();
app.use(bodyParser.json());

const corsOptions = {
  origin: 'https://gap1.netlify.app',
  credentials: true, // if you are using cookies or authentication
};

app.use(cors(corsOptions));

// Database configuration
const config = {
  user: 'Well1',
  password: 'well228608',
  server: 'sanghinstance.chasw9cgenor.ap-south-1.rds.amazonaws.com',
  port: 1857, // Add the port number here
  database: 'GapData1',
  options: {
    encrypt: true, // For Azure SQL Database
    trustServerCertificate: true, // Change this if you're using a self-signed certificate
  },
};

// Connect to the database
sql.connect(config)
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
  });

// Start the server
const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



// For AcGroupMaster

// GET all AcGroupMaster entries
app.get('/api/acgroups', (req, res) => {
  const query = 'SELECT * FROM AcGroupMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new AcGroupMaster entry
app.post('/api/acgroups', (req, res) => {
  const {
    AcGroupCode,
    AcGroupName,
    AcGroupNameEng,
    AcGroupType,
    AcGroupPrintPosition,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  
  const query = `
    INSERT INTO AcGroupMaster (AcGroupCode, AcGroupName, AcGroupNameEng, AcGroupType, AcGroupPrintPosition, DeptCode, YearCode, UserID)
    VALUES (N'${AcGroupCode}', N'${AcGroupName}', N'${AcGroupNameEng}', N'${AcGroupType}', N'${AcGroupPrintPosition}', '${DeptCode}', '${YearCode}', '${UserID}');
  `;
  
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'AcGroupMaster entry created successfully' });
    }
  });
});

// app.put('/api/roomtypes/:AcGroupCode', (req, res) => {
//   const { AcGroupCode } = req.params;
//   const { RoomTypeCode, RoomTypeDesc, Remark1, Remark2 } = req.body;
//   const query = `UPDATE RoomTypeMaster SET RoomTypeCode='${RoomTypeCode}', RoomTypeDesc='${RoomTypeDesc}', Remark1='${Remark1}', Remark2='${Remark2}' WHERE RoomTypeCode='${roomTypeCode}'`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error updating room type:', err); // Log the error
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       console.log('Room type updated successfully'); // Log the success
//       res.json({ message: 'Room type updated successfully' });
//     }
//   });
// });

app.put('/api/acgroups/:AcGroupCode', (req, res) => {
  const { AcGroupCode } = req.params;
  const {
    AcGroupName,
    AcGroupNameEng,
    AcGroupType,
    AcGroupPrintPosition,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;

  const query = `
    UPDATE AcGroupMaster
    SET AcGroupName=N'${AcGroupName}',
        AcGroupNameEng=N'${AcGroupNameEng}',
        AcGroupType=N'${AcGroupType}',
        AcGroupPrintPosition=N'${AcGroupPrintPosition}',
        DeptCode=N'${DeptCode}',
        YearCode=N'${YearCode}',
        UserID=N'${UserID}'
    WHERE AcGroupCode='${AcGroupCode}';
  `;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error updating AcGroupMaster entry:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      console.log('AcGroupMaster entry updated successfully');
      res.json({ message: 'AcGroupMaster entry updated successfully' });
    }
  });
});


// // PUT (Update) an existing AcGroupMaster entry
// app.put('/api/acgroups/:AcGroupCode', (req, res) => {
//   const { AcGroupCode } = req.params;
//   const {
//     AcGroupName,
//     AcGroupNameEng,
//     AcGroupType,
//     AcGroupPrintPosition,
//     DeptCode,
//     YearCode,
//     UserID,
//   } = req.body;
  
//   const query = `
//     UPDATE AcGroupMaster
//     SET AcGroupName='${AcGroupName}', AcGroupNameEng='${AcGroupNameEng}', AcGroupType='${AcGroupType}', AcGroupPrintPosition='${AcGroupPrintPosition}', DeptCode='${DeptCode}', YearCode='${YearCode}', UserID='${UserID}'
//     WHERE AcGroupCode=${AcGroupCode};
//   `;
  
//   sql.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       if (result.rowsAffected && result.rowsAffected[0] > 0) {
//         res.json({
//           message: 'AcGroupMaster entry updated successfully',
//           AcGroupName,
//           AcGroupNameEng,
//           AcGroupType,
//           AcGroupPrintPosition,
//           DeptCode,
//           YearCode,
//           UserID,
//         });
//       } else {
//         res.status(404).json({ error: 'Record not found' });
//       }
//     }
//   });
// });

// DELETE an AcGroupMaster entry
app.delete('/api/acgroups/:acGroupCode', (req, res) => {
  const { acGroupCode } = req.params;
  const query = `DELETE FROM AcGroupMaster WHERE AcGroupCode='${acGroupCode}'`;
  
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'AcGroupMaster entry deleted successfully' });
    }
  });
});


// For DeptMaster ---------------

app.get('/api/items' ,(req,res)=>{
    const query = 'SELECT * FROM DeptMaster'
    sql.query(query, (err , result)=>{
        if(err){
            console.log('error:', err);
            res.status(500).json({error:'internal server error'});
        }else{
            res.json(result.recordset);
        }
    })
})

app.post('/api/items' , (req,res)=>{
    const {DeptCode, DeptName , DeptNameENG , CompCode , Flag} = req.body
    const query = `INSERT INTO DeptMaster (DeptCode ,DeptName, DeptNameENG, CompCode, Flag) VALUES ('${DeptCode}',N'${DeptName}',N'${DeptNameENG}','${CompCode}',N'${Flag}')`;
    sql.query(query, (err) => {
        if (err) {
          console.log('Error:', err);
          res.status(500).json({ error: 'Internal server error' });
        } else {
          res.json({ message: 'Item created successfully' });
        }
      });
});

app.put('/api/item/:deptCode', (req,res)=>{
    const {deptCode} = req.params;
    const { DeptName , DeptNameENG , CompCode , Flag} = req.body
    const query = `UPDATE DeptMaster SET DeptName=N'${DeptName}',DeptNameENG=N'${DeptNameENG}',CompCode='${CompCode}',Flag=N'${Flag}' WHERE DeptCode=${deptCode}`;
    sql.query(query , (err)=>{
        if(err){
            console.log('error:',err);
            res.status(500).json({error:'internal server error'});
        }else{
            res.json({ message: 'Item created successfully' });
        }
    });
});

app.delete('/api/items/:deptCode', (req,res)=>{
    const {deptCode} = req.params;
    const query = `DELETE FROM DeptMaster WHERE DeptCode=${deptCode}`;
    sql.query(query, (err) => {
        if (err) {
          console.log('Error:', err);
          res.status(500).json({ error: 'Internal server error' });
        } else {
          res.json({ message: 'Item deleted successfully' });
        }
      });
});

// For DeptMasterX

// GET endpoint to fetch all DeptMasterX entries
app.get('/api/deptmastersX', (req, res) => {
  const query = 'SELECT * FROM DeptMasterX';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST endpoint to create a new DeptMasterX entry
app.post('/api/deptmastersX', (req, res) => {
  const {
    DeptCode,
    DeptName,
    DeptNameENG,
    CompCode,
    Flag,
  } = req.body;
  const query = `
    INSERT INTO DeptMasterX (DeptCode, DeptName, DeptNameENG, CompCode, Flag)
    VALUES ('${DeptCode}', N'${DeptName}', N'${DeptNameENG}', '${CompCode}', N'${Flag}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'DeptMasterX created successfully' });
    }
  });
});

// PUT endpoint to update an existing DeptMasterX entry
app.put('/api/deptmastersX/:deptCode', (req, res) => {
  const { deptCode } = req.params;
  const {
    DeptName,
    DeptNameENG,
    CompCode,
    Flag,
  } = req.body;
  const query = `
    UPDATE DeptMasterX
    SET DeptName=N'${DeptName}', DeptNameENG=N'${DeptNameENG}', CompCode='${CompCode}', Flag='${Flag}'
    WHERE DeptCode='${deptCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'DeptMasterX updated successfully',
          DeptCode: deptCode,
          DeptName,
          DeptNameENG,
          CompCode,
          Flag,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE endpoint to delete a DeptMasterX entry
app.delete('/api/deptmastersX/:deptCode', (req, res) => {
  const { deptCode } = req.params;
  const query = `DELETE FROM DeptMasterX WHERE DeptCode='${deptCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'DeptMasterX deleted successfully' });
    }
  });
});

//For  designations

app.get('/api/designations', (req, res) => {
  const query = 'SELECT * FROM DesignationMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/designations', (req, res) => {
  const {
    DesigCode,
    Designation,
    DesignationEng,
  } = req.body;

  const query = `
    INSERT INTO DesignationMaster (DesigCode, Designation, DesignationEng)
    VALUES ('${DesigCode}', N'${Designation}', N'${DesignationEng}');
  `;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Designation created successfully' });
    }
  });
});

app.put('/api/designations/:desigCode', (req, res) => {
  const { desigCode } = req.params;
  const {
    Designation,
    DesignationEng,
  } = req.body;

  const query = `
    UPDATE DesignationMaster
    SET Designation=N'${Designation}', DesignationEng=N'${DesignationEng}'
    WHERE DesigCode='${desigCode}';
  `;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Designation updated successfully',
          DesigCode: desigCode,
          Designation,
          DesignationEng,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

app.delete('/api/designations/:desigCode', (req, res) => {
  const { desigCode } = req.params;
  const query = `DELETE FROM DesignationMaster WHERE DesigCode='${desigCode}'`;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Designation deleted successfully' });
    }
  });
});

// For DistrictMaster ----------

app.get('/api/DistrictMaster' ,(req,res)=>{
    const query = 'SELECT * FROM DistrictMaster'
    sql.query(query, (err , result)=>{
        if(err){
            console.log('error:', err);
            res.status(500).json({error:'internal server error'});
        }else{
            res.json(result.recordset);
        }
    })
});

app.put('/api/UpdateDistrictMaster/:DistrictCode', (req, res) => {
  const { DistrictCode } = req.params;
  const { districtName, stateCode, stdCode } = req.body;

  const query = `
    UPDATE DistrictMaster
    SET DistrictName=N'${districtName}', StateCode='${stateCode}', STDCode='${stdCode}'
    WHERE DistrictCode=${DistrictCode};
  `;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'DistrictMaster updated successfully',
          DistrictCode,
          districtName,
          stateCode,
          stdCode,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});


app.post('/api/PostDistrictMaster' , (req,res)=>{
    const {DistrictCode, DistrictName , StateCode , StdCode} = req.body
    const query = `INSERT INTO DistrictMaster (DistrictCode ,DistrictName, StateCode, STDCode) VALUES (${DistrictCode},N'${DistrictName}',${StateCode},'${StdCode}')`;
    sql.query(query, (err) => {
        if (err) {
          console.log('Error:', err);
          res.status(500).json({ error: 'Internal server error' });
        } else {
          res.json({ message: 'Item created successfully' });
        }
      });
});

app.delete('/api/DeleteDistrictMaster/:DistrictCode', (req,res)=>{
    const {DistrictCode} = req.params;
    const query = `DELETE FROM DistrictMaster WHERE DistrictCode=${DistrictCode}`;
    sql.query(query, (err) => {
        if (err) {
          console.log('Error:', err);
          res.status(500).json({ error: 'Internal server error' });
        } else {
          res.json({ message: 'Item deleted successfully' });
        }
      });
});

// For GSTRate
// API to get all GSTRates
app.get('/api/gstrates', (req, res) => {
  const query = 'SELECT * FROM GSTRatesMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// API to create a new GSTRate
app.post('/api/gstrates', (req, res) => {
  const { GSTRateCode, GSTName, GSTPercent, CGSTPercent, SGSTPercent, IGSTPercent, Remark } = req.body;
  const query = `
    INSERT INTO GSTRatesMaster (GSTRateCode, GSTName, GSTPercent, CGSTPercent, SGSTPercent, IGSTPercent, Remark)
    VALUES ('${GSTRateCode}', N'${GSTName}', '${GSTPercent}', '${CGSTPercent}', '${SGSTPercent}', '${IGSTPercent}', '${Remark}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'GSTRate created successfully' });
    }
  });
});

// API to update an existing GSTRate
app.put('/api/gstrates/:gstrateId', (req, res) => {
  const { gstrateId } = req.params;
  const { GSTName, GSTPercent, CGSTPercent, SGSTPercent, IGSTPercent, Remark } = req.body;
  const query = `
    UPDATE GSTRatesMaster
    SET GSTName=N'${GSTName}', GSTPercent='${GSTPercent}', CGSTPercent='${CGSTPercent}',
        SGSTPercent='${SGSTPercent}', IGSTPercent='${IGSTPercent}', Remark=N'${Remark}'
    WHERE GSTRateCode='${gstrateId}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'GSTRate updated successfully',
          GSTRateCode: gstrateId,
          GSTName,
          GSTPercent,
          CGSTPercent,
          SGSTPercent,
          IGSTPercent,
          Remark,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// API to delete a GSTRate
app.delete('/api/gstrates/:gstrateId', (req, res) => {
  const { gstrateId } = req.params;
  const query = `DELETE FROM GSTRatesMaster WHERE GSTRateCode='${gstrateId}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'GSTRate deleted successfully' });
    }
  });
});


//For itemcategories
app.get('/api/itemcategories', (req, res) => {
  const query = 'SELECT * FROM ItemCategoryMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/itemcategories', (req, res) => {
  const {
    ItemCategoryCode,
    ItemCategoryName,
    ItemCategoryNameEng,
    ItemSubGroupCode,
  } = req.body;
  const query = `
    INSERT INTO ItemCategoryMaster (ItemCategoryCode, ItemCategoryName, ItemCategoryNameEng, ItemSubGroupCode)
    VALUES ('${ItemCategoryCode}', N'${ItemCategoryName}', N'${ItemCategoryNameEng}', '${ItemSubGroupCode}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Item category created successfully' });
    }
  });
});

app.put('/api/itemcategories/:itemCategoryId', (req, res) => {
  const { itemCategoryId } = req.params;
  const {
    ItemCategoryName,
    ItemCategoryNameEng,
    ItemSubGroupCode,
  } = req.body;
  const query = `
    UPDATE ItemCategoryMaster
    SET ItemCategoryName=N'${ItemCategoryName}', ItemCategoryNameEng=N'${ItemCategoryNameEng}', ItemSubGroupCode='${ItemSubGroupCode}'
    WHERE ItemCategoryCode='${itemCategoryId}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Item category updated successfully',
          ItemCategoryCode: itemCategoryId,
          ItemCategoryName,
          ItemCategoryNameEng,
          ItemSubGroupCode,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

app.delete('/api/itemcategories/:itemCategoryId', (req, res) => {
  const { itemCategoryId } = req.params;
  const query = `DELETE FROM ItemCategoryMaster WHERE ItemCategoryCode='${itemCategoryId}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Item category deleted successfully' });
    }
  });
});




// For ItemGroupMaster

app.get('/api/item-groups', (req, res) => {
    const query = 'SELECT * FROM ItemGroupMaster';
    sql.query(query, (err, result) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(result.recordset);
      }
    });
  });
  
  app.post('/api/item-groups', (req, res) => {
    const { ItemGroupCode, ItemGroupName, ItemGroupNameEnglish, Remark1, Remark2, UserId } = req.body;
    const query = `
      INSERT INTO ItemGroupMaster (ItemGroupCode, ItemGroupName, ItemGroupNameEnglish, Remark1, Remark2, UserId)
      VALUES ('${ItemGroupCode}', N'${ItemGroupName}', N'${ItemGroupNameEnglish}', N'${Remark1}', N'${Remark2}', '${UserId}');
    `;
    sql.query(query, (err) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'Item group created successfully' });
      }
    });
  });
  
  app.put('/api/item-groups/:ItemGroupCode', (req, res) => {
    const { ItemGroupCode } = req.params;
    const { ItemGroupName, ItemGroupNameEnglish, Remark1, Remark2, UserId } = req.body;
    const query = `
      UPDATE ItemGroupMaster 
      SET ItemGroupName=N'${ItemGroupName}', ItemGroupNameEnglish=N'${ItemGroupNameEnglish}', 
      Remark1=N'${Remark1}', Remark2=N'${Remark2}', UserId='${UserId}' 
      WHERE ItemGroupCode=${ItemGroupCode};
    `;
    sql.query(query, (err, result) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
          res.json({
            message: 'Item group updated successfully',
            ItemGroupName,
            ItemGroupNameEnglish,
            Remark1,
            Remark2,
            UserId,
          });
        } else {
          res.status(404).json({ error: 'Record not found' });
        }
      }
    });
  });
    
  app.delete('/api/item-groups/:ItemGroupCode', (req, res) => {
    const { ItemGroupCode } = req.params;
    const query = `DELETE FROM ItemGroupMaster WHERE ItemGroupCode=${ItemGroupCode}`;
    sql.query(query, (err) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'Item group deleted successfully' });
      }
    });
  });
  


// For ItemMaster
app.get('/api/items-master', (req, res) => {
    const query = 'SELECT * FROM ItemMaster';
    sql.query(query, (err, result) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(result.recordset);
      }
    });
  });
  
app.post('/api/items-master', (req, res) => {
const {
    ItCode,
    ItName,
    ItNameEnglish,
    BarCode,
    ItemSubGroupCode,
    ItemCategoryCode,
    UnitCode,
    PackingCode,
    LocationCode,
    HSNCODE,
    GSTRATECODE,
    Remark1,
    Remark2,
    Remark3,
    Remark4,
    Remark5,
    USERID,
} = req.body;
const query = `
    INSERT INTO ItemMaster (
    ItCode, ItName, ItNameEnglish, BarCode, ItemSubGroupCode, ItemCategoryCode, 
    UnitCode, PackingCode, LocationCode, HSNCODE, GSTRATECODE, Remark1, Remark2,
    Remark3, Remark4, Remark5, USERID
    )
    VALUES (
    '${ItCode}', N'${ItName}', N'${ItNameEnglish}', '${BarCode}', '${ItemSubGroupCode}', 
    '${ItemCategoryCode}', '${UnitCode}', '${PackingCode}', '${LocationCode}', 
    '${HSNCODE}', '${GSTRATECODE}', N'${Remark1}', N'${Remark2}', N'${Remark3}', 
    N'${Remark4}', N'${Remark5}', '${USERID}'
    );
`;
sql.query(query, (err) => {
    if (err) {
    console.log('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
    } else {
    res.json({ message: 'Item created successfully' });
    }
});
});
  
app.put('/api/items-master/:itemId', (req, res) => {
const { itemId } = req.params;
const {
    ItName,
    ItNameEnglish,
    BarCode,
    ItemSubGroupCode,
    ItemCategoryCode,
    UnitCode,
    PackingCode,
    LocationCode,
    HSNCODE,
    GSTRATECODE,
    Remark1,
    Remark2,
    Remark3,
    Remark4,
    Remark5,
    USERID,
} = req.body;
const query = `
    UPDATE ItemMaster
    SET 
    ItName=N'${ItName}', ItNameEnglish=N'${ItNameEnglish}', BarCode='${BarCode}',
    ItemSubGroupCode='${ItemSubGroupCode}', ItemCategoryCode='${ItemCategoryCode}',
    UnitCode='${UnitCode}', PackingCode='${PackingCode}', LocationCode='${LocationCode}',
    HSNCODE='${HSNCODE}', GSTRATECODE='${GSTRATECODE}', Remark1=N'${Remark1}',
    Remark2=N'${Remark2}', Remark3=N'${Remark3}', Remark4=N'${Remark4}', Remark5=N'${Remark5}',
    USERID='${USERID}'
    WHERE ItCode='${itemId}';
`;
sql.query(query, (err, result) => {
    if (err) {
    console.log('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
    } else {
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
        message: 'Item updated successfully',
        ItName,
        ItNameEnglish,
        BarCode,
        ItemSubGroupCode,
        ItemCategoryCode,
        UnitCode,
        PackingCode,
        LocationCode,
        HSNCODE,
        GSTRATECODE,
        Remark1,
        Remark2,
        Remark3,
        Remark4,
        Remark5,
        USERID,
        });
    } else {
        res.status(404).json({ error: 'Record not found' });
    }
    }
});
});
  
app.delete('/api/items-master/:itemId', (req, res) => {
const { itemId } = req.params;
const query = `DELETE FROM ItemMaster WHERE ItCode='${itemId}'`;
sql.query(query, (err) => {
    if (err) {
    console.log('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
    } else {
    res.json({ message: 'Item deleted successfully' });
    }
});
});
  
//For ItemSubGroupMaster


app.get('/api/itemsubgroups', (req, res) => {
  // Replace with your SQL SELECT query
  const query = 'SELECT * FROM ItemSubGroupMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset); // Assuming result is an array of itemSubGroups
    }
  });
});

app.post('/api/itemsubgroups', (req, res) => {
  const { ItemSubGroupCode, ItemSubGroupName, ItemSubGroupNameEnglish, ItemMainGroupCode } = req.body;
  // Replace with your SQL INSERT query
  const query = `
    INSERT INTO ItemSubGroupMaster (ItemSubGroupCode, ItemSubGroupName, ItemSubGroupNameEnglish, ItemMainGroupCode)
    VALUES ('${ItemSubGroupCode}', N'${ItemSubGroupName}', N'${ItemSubGroupNameEnglish}', '${ItemMainGroupCode}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'ItemSubGroup created successfully' });
    }
  });
});

app.put('/api/itemsubgroups/:ItemSubGroupCode', (req, res) => {
  const { ItemSubGroupCode } = req.params;
  const { ItemSubGroupName, ItemSubGroupNameEnglish, ItemMainGroupCode } = req.body;
  // Replace with your SQL UPDATE query
  const query = `
    UPDATE ItemSubGroupMaster
    SET ItemSubGroupName=N'${ItemSubGroupName}', ItemSubGroupNameEnglish=N'${ItemSubGroupNameEnglish}', ItemMainGroupCode='${ItemMainGroupCode}'
    WHERE ItemSubGroupCode='${ItemSubGroupCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result && result.affectedRows > 0) {
        res.json({
          message: 'ItemSubGroup updated successfully',
          ItemSubGroupCode: itemSubGroupCode,
          ItemSubGroupName,
          ItemSubGroupNameEnglish,
          ItemMainGroupCode,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

app.delete('/api/itemsubgroups/:itemSubGroupCode', (req, res) => {
  const { itemSubGroupCode } = req.params;
  // Replace with your SQL DELETE query
  const query = `DELETE FROM ItemSubGroupMaster WHERE ItemSubGroupCode='${itemSubGroupCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'ItemSubGroup deleted successfully' });
    }
  });
});


// For LedgerMaster
// Get all LedgerMaster entries
app.get('/api/ledger-master', (req, res) => {
    const query = 'SELECT * FROM LedgerMaster';
    sql.query(query, (err, result) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(result.recordset);
      }
    });
  });
  
  // Create a new LedgerMaster entry
  app.post('/api/ledger-master', (req, res) => {
    const {
      AcCode,
      AcGroupCode,
      AcHead,
      AcHeadEng,
      SubLedgerYN,
      AcPrintPosition,
      SubLedgerGroupCode,
      DetailYN,
      Remark1,
      Remark2,
      Remark3,
      Remark4,
      Remark5,
      UserID,
    } = req.body;
  
    const query = `
      INSERT INTO LedgerMaster (
        AcCode,
        AcGroupCode,
        AcHead,
        AcHeadEng,
        SubLedgerYN,
        AcPrintPosition,
        SubLedgerGroupCode,
        DetailYN,
        Remark1,
        Remark2,
        Remark3,
        Remark4,
        Remark5,
        UserID
      )
      VALUES (
        '${AcCode}',
        '${AcGroupCode}',
        N'${AcHead}',
        N'${AcHeadEng}',
        '${SubLedgerYN}',
        '${AcPrintPosition}',
        '${SubLedgerGroupCode}',
        N'${DetailYN}',
        N'${Remark1}',
        N'${Remark2}',
        N'${Remark3}',
        N'${Remark4}',
        N'${Remark5}',
        '${UserID}'
      );
    `;
  
    sql.query(query, (err) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'Ledger entry created successfully' });
      }
    });
  });
  
  // Update a LedgerMaster entry by AcCode
  app.put('/api/ledger-master/:AcCode', (req, res) => {
    const { AcCode } = req.params;
    const {
      AcGroupCode,
      AcHead,
      AcHeadEng,
      SubLedgerYN,
      AcPrintPosition,
      SubLedgerGroupCode,
      DetailYN,
      Remark1,
      Remark2,
      Remark3,
      Remark4,
      Remark5,
      UserID,
    } = req.body;
  
    const query = `
      UPDATE LedgerMaster
      SET
        AcGroupCode='${AcGroupCode}',
        AcHead=N'${AcHead}',
        AcHeadEng=N'${AcHeadEng}',
        SubLedgerYN='${SubLedgerYN}',
        AcPrintPosition='${AcPrintPosition}',
        SubLedgerGroupCode=N'${SubLedgerGroupCode}',
        DetailYN='${DetailYN}',
        Remark1=N'${Remark1}',
        Remark2=N'${Remark2}',
        Remark3=N'${Remark3}',
        Remark4=N'${Remark4}',
        Remark5=N'${Remark5}',
        UserID='${UserID}'
      WHERE AcCode='${AcCode}';
    `;
  
    sql.query(query, (err, result) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
          res.json({
            message: 'Ledger entry updated successfully',
            AcCode,
            AcGroupCode,
            AcHead,
            AcHeadEng,
            SubLedgerYN,
            AcPrintPosition,
            SubLedgerGroupCode,
            DetailYN,
            Remark1,
            Remark2,
            Remark3,
            Remark4,
            Remark5,
            UserID,
          });
        } else {
          res.status(404).json({ error: 'Record not found' });
        }
      }
    });
  });
  
  // Delete a LedgerMaster entry by AcCode
  app.delete('/api/ledger-master/:AcCode', (req, res) => {
    const { AcCode } = req.params;
    const query = `DELETE FROM LedgerMaster WHERE AcCode='${AcCode}'`;
    sql.query(query, (err) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'Ledger entry deleted successfully' });
      }
    });
  });



// For Location master

// GET endpoint to fetch all locations
app.get('/api/locations', (req, res) => {
  const query = 'SELECT * FROM LocationMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST endpoint to create a new location
app.post('/api/locations', (req, res) => {
  const { LocationCode, LocationName } = req.body;
  const query = `
    INSERT INTO LocationMaster (LocationCode, LocationName)
    VALUES (N'${LocationCode}', N'${LocationName}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Location created successfully' });
    }
  });
});

// PUT endpoint to update a location
app.put('/api/locations/:locationCode', (req, res) => {
  const { locationCode } = req.params;
  const { LocationName } = req.body;
  const query = `
    UPDATE LocationMaster
    SET LocationName=N'${LocationName}'
    WHERE LocationCode=N'${locationCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Location updated successfully',
          LocationCode: locationCode,
          LocationName,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE endpoint to delete a location
app.delete('/api/locations/:locationCode', (req, res) => {
  const { locationCode } = req.params;
  const query = `DELETE FROM LocationMaster WHERE LocationCode='${locationCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Location deleted successfully' });
    }
  });
});



// for narration 

  app.get('/api/narrations', (req, res) => {
    const query = 'SELECT * FROM NarrationMaster';
    sql.query(query, (err, result) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(result.recordset);
      }
    });
  });

  
  app.post('/api/narrations', (req, res) => {
    const {
      Srno,
      Narration,
      Narration1,
    } = req.body;
    const query = `
      INSERT INTO NarrationMaster (Srno, Narration, Narration1)
      VALUES ('${Srno}', N'${Narration}', N'${Narration1}');
    `;
    sql.query(query, (err) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'Narration created successfully' });
      }
    });
  });

  
  app.put('/api/narrations/:narrationId', (req, res) => {
    const { narrationId } = req.params;
    const {
      Narration,
      Narration1,
    } = req.body;
    const query = `
      UPDATE NarrationMaster
      SET Narration=N'${Narration}', Narration1=N'${Narration1}'
      WHERE Srno=N'${narrationId}';
    `;
    sql.query(query, (err, result) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
          res.json({
            message: 'Narration updated successfully',
            Srno: narrationId,
            Narration,
            Narration1,
          });
        } else {
          res.status(404).json({ error: 'Record not found' });
        }
      }
    });
  });

  app.delete('/api/narrations/:narrationId', (req, res) => {
    const { narrationId } = req.params;
    const query = `DELETE FROM NarrationMaster WHERE Srno='${narrationId}'`;
    sql.query(query, (err) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'Narration deleted successfully' });
      }
    });
  });
  

// For PackingMaster


app.get('/api/packing', (req, res) => {
  const query = 'SELECT * FROM PackingMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/packing', (req, res) => {
  const { PackingCode, PackingName, ConversionFactor } = req.body;
  const query = `
    INSERT INTO PackingMaster (PackingCode, PackingName, ConversionFactor)
    VALUES ('${PackingCode}', N'${PackingName}', '${ConversionFactor}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Packing item created successfully' });
    }
  });
});

app.put('/api/packing/:packingCode', (req, res) => {
  const { packingCode } = req.params;
  const { PackingName, ConversionFactor } = req.body;
  const query = `
    UPDATE PackingMaster
    SET PackingName=N'${PackingName}', ConversionFactor='${ConversionFactor}'
    WHERE PackingCode='${packingCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Packing item updated successfully',
          PackingCode: packingCode,
          PackingName,
          ConversionFactor,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

app.delete('/api/packing/:packingCode', (req, res) => {
  const { packingCode } = req.params;
  const query = `DELETE FROM PackingMaster WHERE PackingCode='${packingCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Packing item deleted successfully' });
    }
  });
});
  
// for statemaster 

// Get all states
app.get('/api/states', (req, res) => {
  const query = 'SELECT * FROM StateMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new state
app.post('/api/states', (req, res) => {
  const { StateCode, StateName } = req.body;
  const query = `
    INSERT INTO StateMaster (StateCode, StateName)
    VALUES ('${StateCode}', N'${StateName}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'State created successfully' });
    }
  });
});

// Update a state by StateCode
app.put('/api/states/:stateCode', (req, res) => {
  const { stateCode } = req.params;
  const { StateName } = req.body;
  const query = `
    UPDATE StateMaster
    SET StateName=N'${StateName}'
    WHERE StateCode='${stateCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'State updated successfully',
          StateCode: stateCode,
          StateName,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a state by StateCode
app.delete('/api/states/:stateCode', (req, res) => {
  const { stateCode } = req.params;
  const query = `DELETE FROM StateMaster WHERE StateCode='${stateCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'State deleted successfully' });
    }
  });
});


// GET SubLedgerGroupMaster entries
app.get('/api/subledgergroups', (req, res) => {
  const query = 'SELECT * FROM SubLedgerGroupMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST SubLedgerGroupMaster entry
app.post('/api/subledgergroups', (req, res) => {
  const {
    SubLedgerGroupCode,
    SubLedgerGroupName,
    SubLedgerGroupNameEng,
    ShortKey,
  } = req.body;
  const query = `
    INSERT INTO SubLedgerGroupMaster (SubLedgerGroupCode, SubLedgerGroupName, SubLedgerGroupNameEng, ShortKey)
    VALUES ('${SubLedgerGroupCode}', N'${SubLedgerGroupName}', N'${SubLedgerGroupNameEng}', '${ShortKey}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'SubLedgerGroup created successfully' });
    }
  });
});

// PUT SubLedgerGroupMaster entry
app.put('/api/subledgergroups/:subledgergroupId', (req, res) => {
  const { subledgergroupId } = req.params;
  const {
    SubLedgerGroupName,
    SubLedgerGroupNameEng,
    ShortKey,
  } = req.body;
  const query = `
    UPDATE SubLedgerGroupMaster
    SET SubLedgerGroupName=N'${SubLedgerGroupName}', SubLedgerGroupNameEng=N'${SubLedgerGroupNameEng}', ShortKey='${ShortKey}'
    WHERE SubLedgerGroupCode='${subledgergroupId}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'SubLedgerGroup updated successfully',
          SubLedgerGroupCode: subledgergroupId,
          SubLedgerGroupName,
          SubLedgerGroupNameEng,
          ShortKey,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE SubLedgerGroupMaster entry
app.delete('/api/subledgergroups/:subledgergroupId', (req, res) => {
  const { subledgergroupId } = req.params;
  const query = `DELETE FROM SubLedgerGroupMaster WHERE SubLedgerGroupCode='${subledgergroupId}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'SubLedgerGroup deleted successfully' });
    }
  });
});

//subledgermaster

// GET SubLedgerGroupMaster entries
app.get('/api/subledgerMaster', (req, res) => {
  const query = 'SELECT * FROM SubLedgerMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new SubLedgerMaster
app.post('/api/subledgerMaster', (req, res) => {
  const {
    SubAcCode,
    SubLedgerGroupCode,
    SubSrNo,
    SubAcHead,
    SubAcHeadEng,
    Address1,
    Address2,
    VillageCode,
    PhoneNo,
    MobileNo,
    Email,
    AadharCardNo,
    BankName,
    BankAcNo,
    PANo,
    GSTNO,
    Remark1,
    Remark2,
    Remark3,
    StatusCode,
    USERID,
  } = req.body;

  const query = `
    INSERT INTO SubLedgerMaster (SubAcCode, SubLedgerGroupCode, SubSrNo, SubAcHead, SubAcHeadEng,
      Address1, Address2, VillageCode, PhoneNo, MobileNo, Email, AadharCardNo, BankName, BankAcNo,
      PANo, GSTNO, Remark1, Remark2, Remark3, StatusCode, USERID)
    VALUES ('${SubAcCode}', '${SubLedgerGroupCode}', '${SubSrNo}', N'${SubAcHead}', '${SubAcHeadEng}',
      N'${Address1}', N'${Address2}', '${VillageCode}', '${PhoneNo}', '${MobileNo}', '${Email}',
      '${AadharCardNo}', N'${BankName}', '${BankAcNo}', '${PANo}', '${GSTNO}', N'${Remark1}',
      N'${Remark2}', N'${Remark3}', '${StatusCode}', N'${USERID}');
  `;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'SubLedgerMaster created successfully' });
    }
  });
});

// Update a SubLedgerMaster by SubAcCode
app.put('/api/subledgerMaster/:SubAcCode', (req, res) => {
  const { SubAcCode } = req.params;
  const {
    SubLedgerGroupCode,
    SubSrNo,
    SubAcHead,
    SubAcHeadEng,
    Address1,
    Address2,
    VillageCode,
    PhoneNo,
    MobileNo,
    Email,
    AadharCardNo,
    BankName,
    BankAcNo,
    PANo,
    GSTNO,
    Remark1,
    Remark2,
    Remark3,
    StatusCode,
    USERID,
  } = req.body;

  const query = `
  UPDATE SubLedgerMaster
  SET SubLedgerGroupCode='${SubLedgerGroupCode}', SubSrNo='${SubSrNo}', SubAcHead=N'${SubAcHead}',
    SubAcHeadEng=N'${SubAcHeadEng}', Address1=N'${Address1}', Address2=N'${Address2}',
    VillageCode='${VillageCode}', PhoneNo='${PhoneNo}', MobileNo='${MobileNo}', Email='${Email}',
    AadharCardNo='${AadharCardNo}', BankName=N'${BankName}', BankAcNo='${BankAcNo}', PANo='${PANo}',
    GSTNO='${GSTNO}', Remark1=N'${Remark1}', Remark2=N'${Remark2}', Remark3=N'${Remark3}',
    StatusCode='${StatusCode}', USERID='${USERID}'
    WHERE SubAcCode='${SubAcCode}';
`;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'SubLedgerMaster updated successfully',
          SubAcCode,
          // ... (other fields)
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a SubLedgerMaster by SubAcCode
app.delete('/api/subledgerMaster/:SubAcCode', (req, res) => {
  const { SubAcCode } = req.params;

  const query = `DELETE FROM SubLedgerMaster WHERE SubAcCode='${SubAcCode}'`;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'SubLedgerMaster deleted successfully' });
    }
  });
});







//taluka master 
// Get all Talukas
app.get('/api/talukas', (req, res) => {
  const query = 'SELECT * FROM TalukaMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new Taluka
app.post('/api/talukas', (req, res) => {
  const {
    TalukaCode,
    TalukaName,
    DistrictCode,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  const query = `
    INSERT INTO TalukaMaster (TalukaCode, TalukaName, DistrictCode, DeptCode, YearCode, UserID)
    VALUES ('${TalukaCode}', N'${TalukaName}', '${DistrictCode}', '${DeptCode}', '${YearCode}', '${UserID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Taluka created successfully' });
    }
  });
});

// Update an existing Taluka
app.put('/api/talukas/:talukaId', (req, res) => {
  const { talukaId } = req.params;
  const {
    TalukaName,
    DistrictCode,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  const query = `
    UPDATE TalukaMaster
    SET TalukaName=N'${TalukaName}', DistrictCode='${DistrictCode}', DeptCode='${DeptCode}', YearCode='${YearCode}', UserID='${UserID}'
    WHERE TalukaCode='${talukaId}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Taluka updated successfully',
          TalukaCode: talukaId,
          TalukaName,
          DistrictCode,
          DeptCode,
          YearCode,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a Taluka
app.delete('/api/talukas/:talukaId', (req, res) => {
  const { talukaId } = req.params;
  const query = `DELETE FROM TalukaMaster WHERE TalukaCode='${talukaId}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Taluka deleted successfully' });
    }
  });
});



//TranGroupMaster entries
// GET all TranGroupMaster entries
app.get('/api/trangroups', (req, res) => {
  const query = 'SELECT * FROM TranGroupMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new TranGroupMaster entry
app.post('/api/trangroups', (req, res) => {
  const {
    AcGroupCode,
    OpBal,
    TOpBal,
    TDebit,
    TCredit,
    TCurBal,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  const query = `
    INSERT INTO TranGroupMaster (AcGroupCode, OpBal, TOpBal, TDebit, TCredit, TCurBal, DeptCode, YearCode, UserID)
    VALUES ('${AcGroupCode}', '${OpBal}', '${TOpBal}', '${TDebit}', '${TCredit}', '${TCurBal}', '${DeptCode}', '${YearCode}', '${UserID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranGroup created successfully' });
    }
  });
});

// PUT (update) a TranGroupMaster entry by AcGroupCode
app.put('/api/trangroups/:acGroupCode', (req, res) => {
  const { acGroupCode } = req.params;
  const {
    OpBal,
    TOpBal,
    TDebit,
    TCredit,
    TCurBal,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  const query = `
    UPDATE TranGroupMaster
    SET OpBal='${OpBal}', TOpBal='${TOpBal}', TDebit='${TDebit}', TCredit='${TCredit}', 
        TCurBal='${TCurBal}', DeptCode='${DeptCode}', YearCode='${YearCode}', UserID='${UserID}'
    WHERE AcGroupCode='${acGroupCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'TranGroup updated successfully',
          AcGroupCode,
          OpBal,
          TOpBal,
          TDebit,
          TCredit,
          TCurBal,
          DeptCode,
          YearCode,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a TranGroupMaster entry by AcGroupCode
app.delete('/api/trangroups/:acGroupCode', (req, res) => {
  const { acGroupCode } = req.params;
  const query = `DELETE FROM TranGroupMaster WHERE AcGroupCode='${acGroupCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranGroup deleted successfully' });
    }
  });
});


//TranItMaster entries
// Get all TranItMaster entries
app.get('/api/tranItMaster', (req, res) => {
  const query = 'SELECT * FROM TranItMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new TranItMaster entry
app.post('/api/tranItMaster', (req, res) => {
  const {
    YearCode,
    DeptCode,
    ItCode,
    Rate,
    OpQty,
    OpWt,
    OpAmt,
    ClQty,
    ClWt,
    ClAmt,
  } = req.body;
  const query = `
    INSERT INTO TranItMaster (YearCode, DeptCode, ItCode, Rate, OpQty, OpWt, OpAmt, ClQty, ClWt, ClAmt)
    VALUES ('${YearCode}', '${DeptCode}', '${ItCode}', '${Rate}', '${OpQty}', '${OpWt}', '${OpAmt}', '${ClQty}', '${ClWt}', '${ClAmt}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranItMaster created successfully' });
    }
  });
});

// Update an existing TranItMaster entry
app.put('/api/tranItMaster/:DeptCode/:ItCode', (req, res) => {
  const {  DeptCode, ItCode } = req.params;
  const {
    YearCode,
    Rate,
    OpQty,
    OpWt,
    OpAmt,
    ClQty,
    ClWt,
    ClAmt,
  } = req.body;
  const query = `
    UPDATE TranItMaster
    SET YearCode='${YearCode}', DeptCode='${DeptCode}', ItCode='${ItCode}', Rate='${Rate}', 
        OpQty='${OpQty}', OpWt='${OpWt}', OpAmt='${OpAmt}', ClQty='${ClQty}', ClWt='${ClWt}', ClAmt='${ClAmt}'
    WHERE DeptCode='${DeptCode}' AND ItCode='${ItCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'TranItMaster updated successfully',
          YearCode,
          DeptCode,
          ItCode,
          Rate,
          OpQty,
          OpWt,
          OpAmt,
          ClQty,
          ClWt,
          ClAmt,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a TranItMaster entry
app.delete('/api/tranItMaster/:DeptCode/:ItCode', (req, res) => {
  const {  DeptCode, ItCode  } = req.params;
  const query = `DELETE FROM TranItMaster WHERE DeptCode='${DeptCode}' AND ItCode='${ItCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranItMaster deleted successfully' });
    }
  });
});

//TranLedgerMaster
// GET all TranLedgerMaster entries
app.get('/api/tranledgers', (req, res) => {
  const query = 'SELECT * FROM TranLedgerMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new TranLedgerMaster entry
app.post('/api/tranledgers', (req, res) => {
  const {
    AcCode,
    OpBal,
    TOpBal,
    TDebit,
    TCredit,
    TCurBal,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  const query = `
    INSERT INTO TranLedgerMaster (AcCode, OpBal, TOpBal, TDebit, TCredit, TCurBal, DeptCode, YearCode, UserID)
    VALUES ('${AcCode}', '${OpBal}', '${TOpBal}', '${TDebit}', '${TCredit}', '${TCurBal}', '${DeptCode}', '${YearCode}', '${UserID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranLedger created successfully' });
    }
  });
});

// PUT (Update) an existing TranLedgerMaster entry
app.put('/api/tranledgers/:AcCode', (req, res) => {
  const { AcCode } = req.params;
  const {
    OpBal,
    TOpBal,
    TDebit,
    TCredit,
    TCurBal,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  const query = `
    UPDATE TranLedgerMaster
    SET OpBal='${OpBal}', TOpBal='${TOpBal}', TDebit='${TDebit}', TCredit='${TCredit}', TCurBal='${TCurBal}', 
    DeptCode='${DeptCode}', YearCode='${YearCode}', UserID='${UserID}'
    WHERE AcCode='${AcCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'TranLedger updated successfully',
          AcCode: AcCode,
          OpBal,
          TOpBal,
          TDebit,
          TCredit,
          TCurBal,
          DeptCode,
          YearCode,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a TranLedgerMaster entry
app.delete('/api/tranledgers/:AcCode', (req, res) => {
  const { AcCode } = req.params;
  const query = `DELETE FROM TranLedgerMaster WHERE AcCode='${AcCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranLedger deleted successfully' });
    }
  });
});


//TranLedgerMasterTemp

// Get all ledger entries
app.get('/api/ledgerentries', (req, res) => {
  const query = 'SELECT * FROM TranLedgerMasterTemp';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new ledger entry
app.post('/api/ledgerentries', (req, res) => {
  const {
    AcCode,
    OpBal,
    TOpBal,
    TDebit,
    TCredit,
    TCurBal,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  const query = `
    INSERT INTO TranLedgerMasterTemp (AcCode, OpBal, TOpBal, TDebit, TCredit, TCurBal, DeptCode, YearCode, UserID)
    VALUES (${AcCode}, ${OpBal}, ${TOpBal}, ${TDebit}, ${TCredit}, ${TCurBal}, ${DeptCode}, ${YearCode}, '${UserID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Ledger entry created successfully' });
    }
  });
});

// Update a ledger entry
app.put('/api/ledgerentries/:acCode', (req, res) => {
  const { acCode } = req.params;
  const {
    OpBal,
    TOpBal,
    TDebit,
    TCredit,
    TCurBal,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  const query = `
    UPDATE TranLedgerMasterTemp
    SET OpBal=${OpBal}, TOpBal=${TOpBal}, TDebit=${TDebit}, TCredit=${TCredit},
        TCurBal=${TCurBal}, DeptCode=${DeptCode}, YearCode=${YearCode}, UserID='${UserID}'
    WHERE AcCode=${acCode};
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Ledger entry updated successfully',
          AcCode: acCode,
          OpBal,
          TOpBal,
          TDebit,
          TCredit,
          TCurBal,
          DeptCode,
          YearCode,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a ledger entry
app.delete('/api/ledgerentries/:acCode', (req, res) => {
  const { acCode } = req.params;
  const query = `DELETE FROM TranLedgerMasterTemp WHERE AcCode=${acCode}`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Ledger entry deleted successfully' });
    }
  });
});

//TranSubLedger entries
// Get all TranSubLedger entries
app.get('/api/tranSubLedgers', (req, res) => {
  const query = 'SELECT * FROM TranSubLedgerMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new TranSubLedger entry
app.post('/api/tranSubLedgers', (req, res) => {
  const {
    AcCode,
    SubAcCode,
    OpBal,
    TOpBal,
    Debit,
    Credit,
    CurBal,
    DeptCode,
    YearCode,
    UserID,
    SubLedgerGroupCode,
  } = req.body;
  const query = `
    INSERT INTO TranSubLedgerMaster (AcCode, SubAcCode, OpBal, TOpBal, Debit, Credit, CurBal, DeptCode, YearCode, UserID, SubLedgerGroupCode)
    VALUES ('${AcCode}', '${SubAcCode}', '${OpBal}', '${TOpBal}', '${Debit}', '${Credit}', '${CurBal}', '${DeptCode}', '${YearCode}', '${UserID}', '${SubLedgerGroupCode}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranSubLedger created successfully' });
    }
  });
});

// Update a TranSubLedger entry
app.put('/api/tranSubLedgers/:acCode', (req, res) => {
  const { acCode } = req.params;
  const {
    SubAcCode,
    OpBal,
    TOpBal,
    Debit,
    Credit,
    CurBal,
    DeptCode,
    YearCode,
    UserID,
    SubLedgerGroupCode,
  } = req.body;
  const query = `
    UPDATE TranSubLedgerMaster
    SET SubAcCode='${SubAcCode}', OpBal='${OpBal}', TOpBal='${TOpBal}', Debit='${Debit}', Credit='${Credit}', CurBal='${CurBal}', DeptCode='${DeptCode}', YearCode='${YearCode}', UserID='${UserID}', SubLedgerGroupCode='${SubLedgerGroupCode}'
    WHERE AcCode='${acCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'TranSubLedger updated successfully',
          AcCode: acCode,
          SubAcCode,
          OpBal,
          TOpBal,
          Debit,
          Credit,
          CurBal,
          DeptCode,
          YearCode,
          UserID,
          SubLedgerGroupCode,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a TranSubLedger entry
app.delete('/api/tranSubLedgers/:acCode', (req, res) => {
  const { acCode } = req.params;
  const query = `DELETE FROM TranSubLedgerMaster WHERE AcCode='${acCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranSubLedger deleted successfully' });
    }
  });
});

//TranSubLedgerMasterTemp
// GET all TranSubLedgerMasterTemp entries
app.get('/api/entries', (req, res) => {
  const query = 'SELECT * FROM TranSubLedgerMasterTemp';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new TranSubLedgerMasterTemp entry
app.post('/api/entries', (req, res) => {
  const {
    AcCode,
    SubAcCode,
    OpBal,
    TOpBal,
    Debit,
    Credit,
    CurBal,
    DeptCode,
    YearCode,
    UserID,
    SubLedgerGroupCode,
  } = req.body;
  const query = `
    INSERT INTO TranSubLedgerMasterTemp (AcCode, SubAcCode, OpBal, TOpBal, Debit, Credit, CurBal, DeptCode, YearCode, UserID, SubLedgerGroupCode)
    VALUES (
      '${AcCode}',
      '${SubAcCode}',
      '${OpBal}',
      '${TOpBal}',
      '${Debit}',
      '${Credit}',
      '${CurBal}',
      '${DeptCode}',
      '${YearCode}',
      '${UserID}',
      '${SubLedgerGroupCode}'
    );
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranSubLedgerMasterTemp entry created successfully' });
    }
  });
});

// PUT (update) a TranSubLedgerMasterTemp entry by ID
app.put('/api/entries/:entryId', (req, res) => {
  const { entryId } = req.params;
  const {
    AcCode,
    SubAcCode,
    OpBal,
    TOpBal,
    Debit,
    Credit,
    CurBal,
    DeptCode,
    YearCode,
    UserID,
    SubLedgerGroupCode,
  } = req.body;
  const query = `
    UPDATE TranSubLedgerMasterTemp
    SET
      AcCode='${AcCode}',
      SubAcCode='${SubAcCode}',
      OpBal='${OpBal}',
      TOpBal='${TOpBal}',
      Debit='${Debit}',
      Credit='${Credit}',
      CurBal='${CurBal}',
      DeptCode='${DeptCode}',
      YearCode='${YearCode}',
      UserID='${UserID}',
      SubLedgerGroupCode='${SubLedgerGroupCode}'
    WHERE AcCode='${entryId}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'TranSubLedgerMasterTemp entry updated successfully',
          AcCode: entryId,
          SubAcCode,
          OpBal,
          TOpBal,
          Debit,
          Credit,
          CurBal,
          DeptCode,
          YearCode,
          UserID,
          SubLedgerGroupCode,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a TranSubLedgerMasterTemp entry by ID
app.delete('/api/entries/:entryId', (req, res) => {
  const { entryId } = req.params;
  const query = `DELETE FROM TranSubLedgerMasterTemp WHERE AcCode='${entryId}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranSubLedgerMasterTemp entry deleted successfully' });
    }
  });
});

// For UnitMaster------------------------------------------------------------------------------------

// GET all units
app.get('/api/units', (req, res) => {
  const query = 'SELECT * FROM UnitMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new unit
app.post('/api/units', (req, res) => {
  const { UnitId, UnitName, DeptCode, YearCode, UserID } = req.body;
  const query = `
    INSERT INTO UnitMaster (UnitId, UnitName, DeptCode, YearCode, UserID)
    VALUES ('${UnitId}', N'${UnitName}', '${DeptCode}', '${YearCode}', N'${UserID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Unit created successfully' });
    }
  });
});

// PUT update an existing unit
app.put('/api/units/:unitId', (req, res) => {
  const { unitId } = req.params;
  const { UnitName, DeptCode, YearCode, UserID } = req.body;
  const query = `
    UPDATE UnitMaster
    SET UnitName=N'${UnitName}', DeptCode='${DeptCode}', YearCode='${YearCode}', UserID=N'${UserID}'
    WHERE UnitId='${unitId}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Unit updated successfully',
          UnitId: unitId,
          UnitName,
          DeptCode,
          YearCode,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a unit
app.delete('/api/units/:unitId', (req, res) => {
  const { unitId } = req.params;
  const query = `DELETE FROM UnitMaster WHERE UnitId='${unitId}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Unit deleted successfully' });
    }
  });
}); 

//VibhagMasters
// GET all VibhagMasters
app.get('/api/vibhags', (req, res) => {
  const query = 'SELECT * FROM VibhagMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new VibhagMaster
app.post('/api/vibhags', (req, res) => {
  const {
    VibhagCode,
    VibhagName,
    VibhagAccode,
    VibhagSrNo,
    VibhagFlag,
    Remark1,
    Remark2,
    Remark3,
    USERID,
  } = req.body;
  const query = `
    INSERT INTO VibhagMaster (VibhagCode, VibhagName, VibhagAccode, VibhagSrNo, VibhagFlag, Remark1, Remark2, Remark3, USERID)
    VALUES ('${VibhagCode}', N'${VibhagName}', '${VibhagAccode}', '${VibhagSrNo}', '${VibhagFlag}', N'${Remark1}', N'${Remark2}', N'${Remark3}', N'${USERID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'VibhagMaster created successfully' });
    }
  });
});

// PUT (update) a VibhagMaster by VibhagCode
app.put('/api/vibhags/:vibhagCode', (req, res) => {
  const { vibhagCode } = req.params;
  const {
    VibhagName,
    VibhagAccode,
    VibhagSrNo,
    VibhagFlag,
    Remark1,
    Remark2,
    Remark3,
    USERID,
  } = req.body;
  const query = `
    UPDATE VibhagMaster
    SET VibhagName=N'${VibhagName}', VibhagAccode='${VibhagAccode}', VibhagSrNo='${VibhagSrNo}', 
        VibhagFlag='${VibhagFlag}', Remark1=N'${Remark1}', Remark2=N'${Remark2}', Remark3=N'${Remark3}', USERID=N'${USERID}'
    WHERE VibhagCode='${vibhagCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'VibhagMaster updated successfully',
          VibhagCode: vibhagCode,
          VibhagName,
          VibhagAccode,
          VibhagSrNo,
          VibhagFlag,
          Remark1,
          Remark2,
          Remark3,
          USERID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a VibhagMaster by VibhagCode
app.delete('/api/vibhags/:vibhagCode', (req, res) => {
  const { vibhagCode } = req.params;
  const query = `DELETE FROM VibhagMaster WHERE VibhagCode='${vibhagCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'VibhagMaster deleted successfully' });
    }
  });
});


//villages
// GET all villages
app.get('/api/villages', (req, res) => {
  const query = 'SELECT * FROM VillageMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new village
app.post('/api/villages', (req, res) => {
  const {
    VillageCode,
    Village,
    DeptCode,
    YearCode,
    UserID,
    TalukaCode,
  } = req.body;
  const query = `
    INSERT INTO VillageMaster (VillageCode, Village, DeptCode, YearCode, UserID, TalukaCode)
    VALUES ('${VillageCode}', N'${Village}', '${DeptCode}', '${YearCode}', N'${UserID}', '${TalukaCode}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Village created successfully' });
    }
  });
});

// PUT (update) a village by ID
app.put('/api/villages/:villageId', (req, res) => {
  const { villageId } = req.params;
  const {
    Village,
    DeptCode,
    YearCode,
    UserID,
    TalukaCode,
  } = req.body;
  const query = `
    UPDATE VillageMaster
    SET Village=N'${Village}', DeptCode='${DeptCode}', YearCode='${YearCode}', UserID='${UserID}', TalukaCode='${TalukaCode}'
    WHERE VillageCode='${villageId}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Village updated successfully',
          VillageCode: villageId,
          Village,
          DeptCode,
          YearCode,
          UserID,
          TalukaCode,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a village by ID
app.delete('/api/villages/:villageId', (req, res) => {
  const { villageId } = req.params;
  const query = `DELETE FROM VillageMaster WHERE VillageCode='${villageId}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Village deleted successfully' });
    }
  });
});


// TranEntry API

// GET all TranEntries
// app.get('/api/distinct-tranentries', (req, res) => {
//   const query = `select distinct EntryNo, TrDate, Flag from TranEntry WHERE Flag = 'T'`;
//   sql.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json(result.recordset);
//     }
//   });
// });

app.get('/api/distinct-tranentries/:flag', (req, res) => {
  const flag = req.params.flag; // Get the "flag" from the route parameters

  // Make sure to validate "flag" and handle any potential security concerns

  const query = `
    SELECT distinct EntryNo, TrDate, Flag
    FROM TranEntry
    WHERE Flag = @flag`; // Use parameterized query to avoid SQL injection

  const request = new sql.Request();
  request.input('flag', sql.NVarChar, flag); // Define the SQL parameter for "flag"

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});


// app.get('/api/tranentries/:entryNo', (req, res) => {
//   const entryNo = req.params.entryNo;  // Get the entry number from the URL

//   // Modify the query to select a specific entry number
//   const query = `SELECT * FROM TranEntry WHERE EntryNo = ${entryNo} AND Flag = 'T'`;
  
//   sql.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json(result.recordset);
//     }
//   });
// })

app.get('/api/tranentries/:entryNo/:flag', (req, res) => {
  const entryNo = req.params.entryNo; // Get the entry number from the URL
  const flag = req.params.flag; // Get the "flag" from the URL parameters

  // Modify the query to select a specific entry number and consider the "flag"
  const query = `
    SELECT *
    FROM TranEntry
    WHERE EntryNo = @entryNo AND Flag = @flag`; // Use parameterized query to avoid SQL injection

  const request = new sql.Request();
  request.input('entryNo', sql.NVarChar, entryNo); // Define the SQL parameter for "entryNo"
  request.input('flag', sql.NVarChar, flag); // Define the SQL parameter for "flag"

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});


app.get('/api/tranNewEntries', (req, res) => {
  const query = 'select * from TranEntryTempSub';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
})

app.post('/api/Savetranentries', (req, res) => {
  // SQL query to insert data into TranEntry and delete from TranEntryTempSub
  const query = `
    DELETE TE
      FROM TranEntry AS TE
      WHERE EXISTS (
        SELECT 1 
        FROM TranEntryTempSub AS TETS 
        WHERE TETS.EntryNo = TE.EntryNo 
          AND TETS.Flag = TE.Flag
      );

    INSERT INTO TranEntry (ID, EntryNo, TrDate, Flag, AcCode, SubLedgerGroupCode, SubAcCode, CrAmt, DrAmt, Narration1, Narration2, Qty, Rate, Narration3, ItemCode, MRP, Amount, Discount, TotalAmt, GSTCode, CGST, SGST, IGST, NetTotalAmt)
    SELECT ID, EntryNo, TrDate, Flag, AcCode, SubLedgerGroupCode, SubAcCode, CrAmt, DrAmt, Narration1, Narration2, Qty, Rate, Narration3, ItemCode, MRP, Amount, Discount, TotalAmt, GSTCode, CGST, SGST, IGST, NetTotalAmt
    FROM TranEntryTempSub;

    DELETE TETS
    FROM TranEntryTempSub AS TETS
    WHERE EXISTS (
      SELECT 1 
      FROM TranEntry AS TE 
      WHERE TE.EntryNo = TETS.EntryNo 
        AND TE.Flag = TETS.Flag
    );
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});




app.post('/api/tranentriesPost', (req, res) => {
  const {
    entryNo,
    trDate,
    acCode,
    subLedgerGroupCode,
    subAcCode,
    crAmt,
    drAmt,
    chqNo,
    narration1,
    narration2,
    narration3,
    flag
  } = req.body;

  let query = `
    INSERT INTO TranEntryTempSub (EntryNo, TrDate, Flag, AcCode, SubLedgerGroupCode, SubAcCode, CrAmt, DrAmt`;

  // Conditionally add chqNo to the SQL query if it's provided
  if (chqNo) {
    query += ', ChqNo';
  }

  // Conditionally add narration1 to the SQL query if it's provided
  if (narration1) {
    query += ', Narration1';
  }

  query += `)
    VALUES ('${entryNo}', '${trDate}', '${flag}', '${acCode}', '${subLedgerGroupCode}', '${subAcCode}', '${crAmt}', '${drAmt}'`;

  // Conditionally add the values for chqNo and narration1
  if (chqNo) {
    query += `, '${chqNo}'`;
  }

  if (narration1) {
    query += `, '${narration1}'`;
  }

  query += ');';

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});


// PUT (update) a TranEntry by ID
app.put('/api/tranentries/:entryNo', (req, res) => {
  const { entryNo } = req.params;
  const {
    TrDate,
    Flag,
    AcCode,
    SubLedgerGroupCode,
    SubAcCode,
    CrAmt,
    DrAmt,
    ChqNo,
    Narration1,
    Narration2,
    Narration3,
  } = req.body;
  const query = `
    UPDATE TranEntry
    SET TrDate='${TrDate}', Flag='${Flag}', AcCode='${AcCode}', SubLedgerGroupCode='${SubLedgerGroupCode}', SubAcCode='${SubAcCode}', CrAmt='${CrAmt}', DrAmt='${DrAmt}', ChqNo='${ChqNo}', Narration1=N'${Narration1}', Narration2=N'${Narration2}', Narration3=N'${Narration3}'
    WHERE EntryNo='${entryNo}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'TranEntry updated successfully',
          EntryNo: entryNo,
          TrDate,
          Flag,
          AcCode,
          SubLedgerGroupCode,
          SubAcCode,
          CrAmt,
          DrAmt,
          ChqNo,
          Narration1,
          Narration2,
          Narration3,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});


app.put('/api/Newtranentries/:ID', (req, res) => {
  const { ID } = req.params;
  const {
    entryNo,
    trDate,
    flag,
    acCode,
    subLedgerGroupCode,
    subAcCode,
    crAmt,
    drAmt,
    chqNo,
    narration1,
    narration2,
    narration3,
  } = req.body;

  // Check if the ID exists in TranEntry
  const queryCheckTranEntry = `SELECT COUNT(*) AS count FROM TranEntry WHERE ID=${ID}`;
  sql.query(queryCheckTranEntry, (err, resultCheckTranEntry) => {
    if (err) {
      console.log('Error checking TranEntry:', err);
      return res.status(500).json({ error: 'Internal server error for TranEntry check' });
    }

    const idExistsInTranEntry = resultCheckTranEntry.recordset[0].count > 0;

    let updateQuery = '';
    if (idExistsInTranEntry) {
      // ID exists in TranEntry, update TranEntry
      updateQuery = `
        UPDATE TranEntry
        SET TrDate='${trDate}', Flag='${flag}', AcCode='${acCode}', SubLedgerGroupCode='${subLedgerGroupCode}', SubAcCode='${subAcCode}', CrAmt='${crAmt}', DrAmt='${drAmt}'${chqNo ? `, ChqNo='${chqNo}'` : ''}${narration1 ? `, Narration1='${narration1}'` : ''} WHERE ID=${ID};`;
    } else {
      // ID exists in TranEntryTempSub, update TranEntryTempSub
      updateQuery = `
        UPDATE TranEntryTempSub
        SET TrDate='${trDate}', Flag='${flag}', AcCode='${acCode}', SubLedgerGroupCode='${subLedgerGroupCode}', SubAcCode='${subAcCode}', CrAmt='${crAmt}', DrAmt='${drAmt}'${chqNo ? `, ChqNo='${chqNo}'` : ''}${narration1 ? `, Narration1='${narration1}'` : ''} WHERE ID=${ID};`;
    }
    // Execute the update query
    sql.query(updateQuery, (err, result) => {
      if (err) {
        console.log('Error updating:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      const rowsAffected = result.rowsAffected && result.rowsAffected[0];

      if (rowsAffected > 0) {
        return res.json({
          message: 'Record updated successfully',
          entryNo,
          trDate,
          flag,
          acCode,
          subLedgerGroupCode,
          subAcCode,
          crAmt,
          drAmt,
          chqNo,
          narration1,
          narration2,
          narration3,
        });
      } else {
        return res.status(404).json({ error: 'Record not found for the specified ID', ID });
      }
    });
  });
});

// DELETE a TranEntry by ID
app.delete('/api/tranentries/:entryNo/:flag', (req, res) => {
  const { entryNo, flag } = req.params;
  const query = `DELETE FROM TranEntry WHERE EntryNo='${entryNo}' AND Flag='${flag}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranEntry deleted successfully' });
    }
  });
});


app.delete('/api/Newtranentries/:Id', (req, res) => {
  const { Id } = req.params;

  // Construct queries for deleting from both tables
  const queryTranEntryTempSub = `DELETE FROM TranEntryTempSub WHERE ID=${Id}`;
  const queryTranEntry = `DELETE FROM TranEntry WHERE ID=${Id}`;

  // Execute the first query to delete from TranEntryTempSub
  sql.query(queryTranEntryTempSub, (err) => {
    if (err) {
      console.log('Error deleting from TranEntryTempSub:', err.message);
      res.status(500).json({ error: 'Error deleting from TranEntryTempSub' });
    } else {
      console.log('Deleted from TranEntryTempSub:', queryTranEntryTempSub);

      // Execute the second query to delete from TranEntry
      sql.query(queryTranEntry, (err) => {
        if (err) {
          console.log('Error deleting from TranEntry:', err.message);
          res.status(500).json({ error: 'Error deleting from TranEntry' });
        } else {
          console.log('Deleted from TranEntry:', queryTranEntry);
          res.json({ message: 'Record deleted successfully from both tables' });
        }
      });
    }
  });
});

//For sell entry
app.get('/api/distinct-sellentries/:flag', (req, res) => {
  const flag = req.params.flag; // Get the "flag" from the route parameters

  // Make sure to validate "flag" and handle any potential security concerns

  const query = `
    SELECT distinct EntryNo, TrDate, Flag
    FROM TranEntry
    WHERE Flag = @flag`; // Use parameterized query to avoid SQL injection

  const request = new sql.Request();
  request.input('flag', sql.NVarChar, flag); // Define the SQL parameter for "flag"

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});



app.get('/api/sellentries/:entryNo/:flag', (req, res) => {
  const entryNo = req.params.entryNo; // Get the entry number from the URL
  const flag = req.params.flag; // Get the "flag" from the URL parameters

  // Modify the query to select a specific entry number and consider the "flag"
  const query = `
    SELECT *
    FROM TranEntry
    WHERE EntryNo = @entryNo AND Flag = @flag`; // Use parameterized query to avoid SQL injection

  const request = new sql.Request();
  request.input('entryNo', sql.NVarChar, entryNo); // Define the SQL parameter for "entryNo"
  request.input('flag', sql.NVarChar, flag); // Define the SQL parameter for "flag"

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});



app.post('/api/sellentriesPost', (req, res) => {
  const {
      entryNo,
      trDate,
      acCode,
      itemCode,
      subAcCode,
      MRP,
      Qty,
      Rate,
      Amt,
      Discount,
      TotalAmt,
      Gst,
      CGst,
      SGst,
      IGst,
      NetTotAmt,
      flag
  } = req.body;


  let query = `
    INSERT INTO TranEntryTempSub (EntryNo, TrDate, Flag, AcCode, ItemCode, SubAcCode, MRP, Qty, Rate, Amount, Discount, TotalAmt, GSTCode, CGST, SGST, IGST, NetTotalAmt) VALUES ('${entryNo}', '${trDate}', '${flag}', '${acCode}', '${itemCode}', '${subAcCode}', '${MRP}', '${Qty}', '${Rate}', '${Amt}', '${Discount}', '${TotalAmt}', '${Gst}', '${CGst}', '${SGst}', '${IGst}', '${NetTotAmt}');`;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.post('/api/insertDataAndFlag', (req, res) => {
  const entryNo = req.body.entryNo;
  const flag = req.body.flag;

  const query = `
    DELETE FROM TranEntryTempSub;

    INSERT INTO TranEntryTempSub (EntryNo, TrDate, Flag, AcCode, SubLedgerGroupCode, SubAcCode, CrAmt, DrAmt, Narration1, Narration2, Qty, Rate, Narration3, ItemCode, MRP, Amount, Discount, TotalAmt, GSTCode, CGST, SGST, IGST, NetTotalAmt)
    SELECT EntryNo, TrDate, Flag, AcCode, SubLedgerGroupCode, SubAcCode, CrAmt, DrAmt, Narration1, Narration2, Qty, Rate, Narration3, ItemCode, MRP, Amount, Discount, TotalAmt, GSTCode, CGST, SGST, IGST, NetTotalAmt
    FROM TranEntry
    WHERE EntryNo = @entryNo AND Flag = @flag;
  `;

  const request = new sql.Request();
  request.input('entryNo', sql.Int, entryNo);
  request.input('flag', sql.VarChar(255), flag);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.put('/api/NewSaleEntries/:ID', (req, res) => {
  const { ID } = req.params;
  const {
    entryNo,
    trDate,
    flag,
    acCode,
    itemCode,
    MRP,
    Qty,
    Rate,
    Amt,
    Discount,
    TotalAmt,
    Gst,
    CGst,
    SGst,
    IGst,
    NetTotAmt,
  } = req.body;

  // Always update TranEntryTempSub
  const updateQuery = `
    UPDATE TranEntryTempSub
    SET TrDate='${trDate}', Flag='${flag}', AcCode='${acCode}', ItemCode='${itemCode}', MRP='${MRP}', Qty='${Qty}', Rate='${Rate}', Amount='${Amt}', Discount='${Discount}', TotalAmt='${TotalAmt}', GSTCode='${Gst}', CGST='${CGst}', SGST='${SGst}', IGST='${IGst}', NetTotalAmt='${NetTotAmt}' WHERE ID=${ID};`;

  // Execute the update query
  sql.query(updateQuery, (err, result) => {
    if (err) {
      console.log('Error updating:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const rowsAffected = result.rowsAffected && result.rowsAffected[0];

    if (rowsAffected > 0) {
      return res.json({
        message: 'Record updated successfully',
        entryNo,
        trDate,
        flag,
        acCode,
        itemCode,
        MRP,
        Qty,
        Rate,
        Amt,
        Discount,
        TotalAmt,
        Gst,
        CGst,
        SGst,
        IGst,
        NetTotAmt,
      });
    } else {
      return res.status(404).json({ error: 'Record not found for the specified ID', ID });
    }
  });
});

//Report 

app.get('/api/sellentries/:entryNo/:flag', (req, res) => {
  const entryNo = req.params.entryNo; // Get the entry number from the URL
  const flag = req.params.flag; // Get the "flag" from the URL parameters

  // Modify the query to select a specific entry number and consider the "flag"
  const query = `
    SELECT *
    FROM TranEntry
    WHERE EntryNo = @entryNo AND Flag = @flag`; // Use parameterized query to avoid SQL injection

  const request = new sql.Request();
  request.input('entryNo', sql.NVarChar, entryNo); // Define the SQL parameter for "entryNo"
  request.input('flag', sql.NVarChar, flag); // Define the SQL parameter for "flag"

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// app.get('/api/report/:paramCode', async (req, res) => {
//   const url = "http://localhost:8080/jasperserver/rest_v2/reports/reports/Customer.pdf";
//   const paramCode = req.params.paramCode;
//   const params = {
//     ParamCode: paramCode
//   };

//   try {
//     const file = await axios.get(url, {
//       params: params,
//       responseType: "stream",
//       auth: {
//         username: "jasperadmin",
//         password: "jasperadmin"
//       }
//     });

//     // Set the appropriate headers, including character encoding
//     res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
//     res.setHeader('Content-Disposition', 'inline; filename=report.pdf');

//     file.data.pipe(res);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Internal Server Error: ${error.message}');
//   }
// });


// app.get('/api/report/:paramCode', async (req, res) => {
//   const jasperReportsHost = 'https://accountingbackend.onrender.com'; // Update this with the correct host

//   const url = `${jasperReportsHost}/jasperserver/rest_v2/reports/reports/Customer.pdf`;
//   const paramCode = req.params.paramCode;
//   const params = {
//     ParamCode: paramCode
//   };

//   try {
//     const file = await axios.get(url, {
//       params: params,
//       responseType: 'stream',
//       auth: {
//         username: 'jasperadmin',
//         password: 'jasperadmin'
//       }
//     });

//     // Set the appropriate headers, including character encoding
//     res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
//     res.setHeader('Content-Disposition', 'inline; filename=report.pdf');

//     file.data.pipe(res);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send(`Internal Server Error: ${error.message}`);
//   }
// });


app.get('/api/report/:paramCode', async (req, res) => {
  const url = "http://192.168.1.9:8080/jasperserver/rest_v2/reports/reports/Customer.pdf";
  const paramCode = req.params.paramCode;
  const params = {
    ParamCode: paramCode
  };

  try {
    const file = await axios.get(url, {
      params: params,
      responseType: "stream",
      auth: {
        username: "jasperadmin",
        password: "jasperadmin"
      }
    });

    // Set the appropriate headers, including character encoding
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename=report.pdf');

    file.data.pipe(res);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});



// app.get('/api/report/:paramCode', async (req, res) => {
//   // const url = "http://localhost:8080/jasperserver/rest_v2/reports/reports/Customer.jrxml";
//   const url = "http://localhost:8080/jasperserver/rest_v2/reports/reports/Customer.pdf";


//   const paramCode = req.params.paramCode;

//   const params = {
//     ParamCode: paramCode
//   };

//   try {
//     const file = await axios.get(url, {
//       params: params,
//       responseType: "stream",
//       auth: {
//         username: "jasperadmin",
//         password: "jasperadmin"
//       }
//     });

//     res.writeHead(200, { "Content-Type": "application/pdf" });
//     file.data.pipe(res);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });
