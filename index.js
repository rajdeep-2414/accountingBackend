/* const express = require ('express');
const bodyParcer = require ('body-parser');
const cors = require ('cors');
const sql = require ('mssql/msnodesqlv8');

const app = express();
app.use(bodyParcer.json());
app.use(cors());


const config = {
  driver: 'msnodesqlv8',
  connectionString: 'Driver={SQL Server};Server=AYJLAPTOP\\SQLEXPRESS;Database=GapData1;Trusted_Connection=yes;',
    options: {
    trustedConnection: true, 
  },
};

sql.connect(config , (err)=>{
    if(err){
        console.log('Error:',err);
    }else{
        console.log('connected')
    }
});

// Start the server
const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});
*/

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sql = require('mssql');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const AWS = require('aws-sdk');
const passport = require('passport');
const passportConfig = require('./passport-config'); // Import the passport middleware
const { generateToken, getTokenFromHeaders, verifyToken } = require('./auth');
require('dotenv').config();
const authenticateToken = require('./authMiddleware');


const app = express();
app.use(bodyParser.json());
app.use(cors());
passportConfig(passport);
app.use(passport.initialize());
// app.use(cors({ origin: 'https://hgap.netlify.app' }));



// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: 1857,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    requestTimeout: 30000 
  },
};

const defaultDatabase = 'GapCompany'; // Default database name
// const defaultDatabase = 'GapData1FY2425'; // Default database name
// const defaultDatabase = 'GapData1FY2324OLD'; // Default database name

// Connect to the default database on server startup
connectToDatabase(defaultDatabase)
  .then(() => {
    console.log(`Connected to the default database: ${defaultDatabase}`);
  })
  .catch((error) => {
    console.error('Error connecting to the default database:', error);
  });

app.get('/api/company_code', (req, res) => {
  const query = 'SELECT * FROM GapCompany.dbo.CompanyMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/database_year_master', (req, res) => {
  const query = 'SELECT * FROM GapCompany.dbo.YearMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/connect', async (req, res) => {
  const { companyCode, financialYear } = req.body;

  if (!companyCode || !financialYear) {
    return res.status(400).json({ error: 'Company code and financial year are required' });
  }

  const databaseName = `GapData${companyCode}FY${financialYear}`;
  // const databaseName = `GapData1FY2324OLD`;
  console.log('GapData${companyCode}-${financialYear}', `GapData${companyCode}FY${financialYear}`);
  // const databaseName = `GapData${companyCode}`;

  if (sql && sql.close) {
    await sql.close();
    console.log('Closed existing database connection');
  }

  try {
    const isConnected = await connectToDatabase(databaseName);
    if (isConnected) {
      res.json({ message: `Successfully connected to the ${databaseName} database` });
    } else {
      res.status(500).json({ error: 'Failed to connect to the database' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Connect to the database function
async function connectToDatabase(databaseName) {
  const config = {
    ...dbConfig,
    database: databaseName
  };
  try {
    await sql.connect(config);
    console.log("config", config);
    console.log(`Connected to the ${databaseName} database`);
    return true;
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return false;
  }
}


app.post('/close-sql-connection', async (req, res) => {
  try {
    // Close the SQL connection
    await sql.close();
    res.json({ message: 'SQL connection closed successfully' });
  } catch (error) {
    console.error('Error closing SQL connection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Assuming you have your route defined like this
app.post('/logout', authenticateToken, async (req, res) => {
  try {
    await sql.connect(defaultDatabase);
    console.log(`Reconnected to the default database: ${defaultDatabase}`);

    // Respond to the client indicating successful logout
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error closing SQL connection or reconnecting to the default database:', error);
    // Respond with an error to the client
    res.status(500).json({ error: 'An error occurred during logout' });
  }
});


app.get('/file/:filename', (req, res) => {
  const params = {
    Bucket: 'webgap-images',
    Key: req.params.filename // Use the filename specified in the URL
  };

  s3.getObject(params, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error retrieving file from S3.');
    }

    // Retrieve original filename from metadata
    const originalFilename = data.Metadata.originalFilename;

    // Set the appropriate Content-Type header
    res.set('Content-Type', data.ContentType);

    // Set the appropriate Content-Disposition header to make the browser display the file
    res.set('Content-Disposition', `inline; filename="${originalFilename}"`);

    // Send the file data in the response
    res.send(data.Body);
  });
});

app.delete('/deletefile/:filename', (req, res) => {
  const params = {
    Bucket: 'webgap-images',
    Key: "56679fb0-b901-4c22-a6cb-8ca6dea65873-efgh.jpg" // Use the filename specified in the URL
  };

  s3.deleteObject(params, (err, data) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).send('Error deleting file from S3.');
    }

    console.log('File deleted successfully:', req.params.filename);
    res.send('File deleted successfully.');
  });
});

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// correct code
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
});

app.post('/api/login', (req, res) => {
  const { encryptedData } = req.body;

  // Decrypt the payload
  const bytes = CryptoJS.AES.decrypt(encryptedData, 'loginlogic');
  const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

  const { username, password, companyCode } = decryptedData;

  // Validate input (optional, depending on your requirements)
  const query = `
    SELECT * FROM Users
    WHERE UserName = '${username}'
  `;

  sql.query(query, async (err, result) => {
    if (err) {
      console.log('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.recordset.length > 0) {
        const storedHashedPassword = result.recordset[0].Password;

        // Compare entered password with stored hashed password
        const passwordMatch = await bcrypt.compare(password, storedHashedPassword);

        if (passwordMatch) {
          // Passwords match, generate a JWT token
          const token = generateToken({ username });
          console.log('Token:', token);
          res.json({ token, message: 'Login successful', username }); // Send token in response body
        } else {
          // Incorrect password
          res.status(401).json({ error: 'Invalid credentials' });
        }
      } else {
        // No user found with the given username
        res.status(401).json({ error: 'Invalid credentials' });
      }
    }
  });
});


// app.post('/api/login', authenticateToken, (req, res) => {
//   const { username, password } = req.body;

//   // Validate input (optional, depending on your requirements)
//   const query = `
//     SELECT * FROM Users
//     WHERE UserName = '${username}'
//   `;

//   sql.query(query, async (err, result) => {
//     if (err) {
//       console.log('Error executing SQL query:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       if (result.recordset.length > 0) {
//         const storedHashedPassword = result.recordset[0].Password;

//         // Compare entered password with stored hashed password
//         const passwordMatch = await bcrypt.compare(password, storedHashedPassword);

//         if (passwordMatch) {
//           // Passwords match, generate and send a JWT token
//           const token = generateToken({ username });
//           console.log('Token:', token);
//           res.json({ token, message: 'Login successful', username });
//         } else {
//           // Incorrect password
//           res.status(401).json({ error: 'Invalid credentials' });
//         }
//       } else {
//         // No user found with the given username
//         res.status(401).json({ error: 'Invalid credentials' });
//       }
//     }
//   });
// });

// app.post('/api/login', authenticateToken, (req, res) => {
//   const { username, password } = req.body;

//   // Validate input (optional, depending on your requirements)
//   const query = `
//     SELECT * FROM Users
//     WHERE UserName = '${username}'
//   `;

//   sql.query(query, async (err, result) => {
//     if (err) {
//       console.log('Error Executing SQL query :', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       if (result.recordset.length > 0) {
//         const storedHashedPassword = result.recordset[0].Password;

//         // Compare entered password with stored hashed password
//         const passwordMatch = await bcrypt.compare(password, storedHashedPassword);

//         const loggedInUsername = result.recordset[0].UserName;
//         if (passwordMatch) {
//           res.json({ message: 'Login successful', username: loggedInUsername });
//         } else {
//           res.status(401).json({ error: 'Invalid credentials' });
//         }
//       } else {
//         res.status(401).json({ error: 'Invalid credentials' });
//       }
//     }
//   });
// });

const checkDeleteAuthority = (req, res, next) => {
  console.log('Checking delete authority middleware');
  // const username = req.session.username;
  console.log('Username:', username);
  const query = `SELECT AllowMasterDelete FROM Users WHERE UserName='${username}'`;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result && result.recordset && result.recordset.length > 0) {
        const allowDelete = result.recordset[0].AllowMasterDelete;
        if (allowDelete === 1) {
          console.log("allowDelete", allowDelete);
          console.log('SQL Query:', query);
          next();
        } else {
          res.status(403).json({ error: 'Not allowed to delete' });
        }
      } else {
        res.status(403).json({ error: 'User not found or permission not set' });
      }
    }
  });
};

app.post('/multiple-upload', upload.array('images', 9), (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).send('No files uploaded.');
  }

  // Loop through each file and upload it to S3
  files.forEach(file => {
    const params = {
      Bucket: 'webgap-images',
      Key: `${file.originalname}`, // Unique key for the file
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalFilename: file.originalname // Include original filename as metadata
      }
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error uploading files to S3.');
      }
      console.log('File uploaded successfully:', data.Location);
    });
  });

  res.send('Files uploaded successfully.');
});


app.post('/single-upload', upload.single('image'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const params = {
    Bucket: 'webgap-images',
    Key: `${file.originalname}`, // Unique key for the file
    Body: file.buffer,
    ContentType: file.mimetype,
    Metadata: {
      originalFilename: file.originalname // Include original filename as metadata
    }
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error uploading file to S3.');
    }
    res.send('File uploaded successfully.');
  });
});


// app.get('/file/:fileName', (req, res) => {
//   const fileName = req.params.fileName;

//   // Check if the mapping for the file name exists
//   if (!fileMappings[fileName]) {
//     return res.status(404).send('File not found.');
//   }

//   // Retrieve file from S3 using the UUID-prefixed key
//   const params = {
//     Bucket: 'webgap-images',
//     Key: fileMappings[fileName]
//   };

//   s3.getObject(params, (err, data) => {
//     if (err) {
//       console.error("Error getting object: ", err);
//       return res.status(500).send('Error getting file from S3.');
//     }

//     // Set response headers based on file metadata
//     res.set('Content-Type', data.ContentType);
//     res.set('Content-Disposition', `attachment; filename="${fileName}"`);

//     // Send the file data as response
//     res.send(data.Body);
//   });
// });

app.delete('/deletefile/:filename', (req, res) => {
  const params = {
    Bucket: 'webgap-images',
    Key: "56679fb0-b901-4c22-a6cb-8ca6dea65873-efgh.jpg" // Use the filename specified in the URL
  };

  s3.deleteObject(params, (err, data) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).send('Error deleting file from S3.');
    }

    console.log('File deleted successfully:', req.params.filename);
    res.send('File deleted successfully.');
  });
});


// Start the server
const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

///im upload

//  const storage = multer.diskStorage({
//    destination: (req, file, cb) => {
//       const destinationPath = path.join('C:/Users/91942/Pictures/photopath');
//       cb(null, destinationPath);
//    },
//    filename: (req, file, cb) => {
//       cb(null, file.originalname);
//    },
// });

// const upload = multer({ storage : storage });


// Serve static files from the photopath directory

app.use('/img', express.static('C:/Users/91942/Pictures/photopath'));

app.put('/api/change-password', async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  try {
    // Validate input (optional, depending on your requirements)
    const userQuery = `
        SELECT * FROM Users
        WHERE UserName = '${username}'
      `;

    sql.query(userQuery, async (err, result) => {
      if (err) {
        console.log('Error Executing SQL query:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        if (result.recordset.length > 0) {
          const storedHashedPassword = result.recordset[0].Password;

          // Compare entered old password with stored hashed password
          const passwordMatch = await bcrypt.compare(oldPassword, storedHashedPassword);

          if (passwordMatch) {
            // Hash the new password
            const newHashedPassword = await bcrypt.hash(newPassword, 10);

            // Update the password in the database
            const updateQuery = `
                UPDATE Users
                SET Password = '${newHashedPassword}'
                WHERE UserName = '${username}'
              `;

            sql.query(updateQuery, (updateErr) => {
              if (updateErr) {
                console.log('Error updating password:', updateErr);
                res.status(500).json({ error: 'Internal server error' });
              } else {
                res.json({ message: 'Password changed successfully' });
                console.log("Password Updated !...");

              }
            });
          } else {
            res.status(401).json({ error: 'Incorrect old password' });
          }
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      }
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', async (req, res) => {
  const {
    username,
    password,
    isAdmin,
    allowMasterAdd,
    allowMasterEdit,
    allowMasterDelete,
    allowEntryAdd,
    allowEntryEdit,
    allowEntryDelete,
    allowBackdatedEntry,
    passwordHint,
  } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    //console.log("Hashed Password",hashedPassword);
    const query = `
          INSERT INTO Users (
            UserName,
            Password,
            Passwordhint,
            Administrator,
            AllowMasterAdd,
            AllowMasterEdit,
            AllowMasterDelete,
            AllowEntryAdd,
            AllowEntryEdit,
            AllowEntryDelete,
            AllowBackdatedEntry
          )
          VALUES (
            '${username}',
            '${hashedPassword}',       --Store the hashed password
            '${passwordHint}',
            '${isAdmin ? 1 : 0}',
            '${allowMasterAdd ? 1 : 0}',
            '${allowMasterEdit ? 1 : 0}',
            '${allowMasterDelete ? 1 : 0}',
            '${allowEntryAdd ? 1 : 0}',
            '${allowEntryEdit ? 1 : 0}',
            '${allowEntryDelete ? 1 : 0}',
            '${allowBackdatedEntry ? 1 : 0}'
          )
        `;

    sql.query(query, (err) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'User created successfully' });
      }
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/getusers', (req, res) => {
  const query = `SELECT * FROM Users`;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Example endpoint: Update an existing item
app.put('/api/updateUser/:username', async (req, res) => {
  const { username } = req.params;
  const {
    password,
    isAdmin,
    allowMasterAdd,
    allowMasterEdit,
    allowMasterDelete,
    allowEntryAdd,
    allowEntryEdit,
    allowEntryDelete,
    allowBackdatedEntry,
    passwordHint } = req.body;

  try {
    const hashPassword = await bcrypt.hash(password, 10);
    const query = `UPDATE Users SET  Password='${hashPassword}', Administrator=${isAdmin ? 1 : 0}, AllowMasterAdd=${allowMasterAdd ? 1 : 0}, AllowMasterEdit=${allowMasterEdit ? 1 : 0}, AllowMasterDelete=${allowMasterDelete ? 1 : 0}, AllowEntryAdd=${allowEntryAdd ? 1 : 0}, AllowEntryEdit=${allowEntryEdit ? 1 : 0}, AllowEntryDelete=${allowEntryDelete ? 1 : 0}, AllowBackdatedEntry=${allowBackdatedEntry ? 1 : 0},Passwordhint='${passwordHint}' WHERE UserName ='${username}'`;
    sql.query(query, (err) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'Item updated successfully' });
      }
    });
  } catch (error) {
    console.log("error for updating hashpassword", error);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.delete('/api/deleteUser/:UserName', (req, res) => {
  const { UserName } = req.params;
  const query = `DELETE FROM Users WHERE UserName = '${UserName}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Item deleted successfully' });
    }
  });
});

// For AcGroupMaster
// GET all AcGroupMaster entries
app.get('/api/acgroups', authenticateToken, (req, res) => {
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
app.post('/api/acgroups', authenticateToken, (req, res) => {
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


app.put('/api/acgroups/:AcGroupCode', authenticateToken, (req, res) => {
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

// DELETE an AcGroupMaster entry
app.delete('/api/acgroups/:acGroupCode', authenticateToken, async (req, res) => {
  const { acGroupCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM AcGroupMaster WHERE AcGroupCode='${acGroupCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'AcGroupMaster deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// For DeptMaster ---------------

app.get('/api/items', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM DeptMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(result.recordset);
  });
});

app.post('/api/items', authenticateToken, (req, res) => {
  const { DeptCode, DeptName, DeptNameENG, CompCode, Flag, UserID } = req.body
  const query = `INSERT INTO DeptMaster (DeptCode ,DeptName, DeptNameENG, CompCode, Flag, UserID) VALUES ('${DeptCode}',N'${DeptName}',N'${DeptNameENG}','${CompCode}',N'${Flag}','${UserID}')`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Item created successfully' });
    }
  });
});

app.put('/api/item/:deptCode', authenticateToken, (req, res) => {
  const { deptCode } = req.params;
  const { DeptName, DeptNameENG, CompCode, Flag, UserID } = req.body
  const query = `UPDATE DeptMaster SET DeptName=N'${DeptName}',DeptNameENG=N'${DeptNameENG}',CompCode='${CompCode}',Flag=N'${Flag}' ,UserID='${UserID}' WHERE DeptCode=${deptCode}`;
  sql.query(query, (err) => {
    if (err) {
      console.log('error:', err);
      res.status(500).json({ error: 'internal server error' });
    } else {
      res.json({ message: 'Item created successfully' });
    }
  });
});

app.delete('/api/items/:deptCode', authenticateToken, authenticateToken, async (req, res) => {
  const { deptCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM DeptMaster WHERE DeptCode='${deptCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'DeptMaster deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/designations', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM DesignationMaster ORDER BY DesigCode';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/designations', authenticateToken, (req, res) => {
  const {
    DesigCode,
    Designation,
    DesignationEng,
    UserID
  } = req.body;

  const query = `
      INSERT INTO DesignationMaster (DesigCode, Designation, DesignationEng,UserID)
      VALUES ('${DesigCode}', N'${Designation}', N'${DesignationEng}','${UserID}');
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

app.put('/api/designations/:desigCode', authenticateToken, (req, res) => {
  const { desigCode } = req.params;
  const {
    Designation,
    DesignationEng,
    UserID
  } = req.body;

  const query = `
      UPDATE DesignationMaster
      SET Designation=N'${Designation}', DesignationEng=N'${DesignationEng}',UserID='${UserID}'
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
app.delete('/api/designations/:desigCode', authenticateToken, async (req, res) => {
  const { desigCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM DesignationMaster WHERE DesigCode='${desigCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Designation deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// app.delete('/api/designations/:desigCode', authenticateToken, (req, res) => {
//   const { desigCode } = req.params;
//   const query = `DELETE FROM DesignationMaster WHERE DesigCode='${desigCode}'`;

//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Designation deleted successfully' });
//     }
//   });
// });

// For DistrictMaster ----------

app.get('/api/DistrictMaster', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM DistrictMaster'
  sql.query(query, (err, result) => {
    if (err) {
      console.log('error:', err);
      res.status(500).json({ error: 'internal server error' });
    } else {
      res.json(result.recordset);
    }
  })
});

app.put('/api/UpdateDistrictMaster/:DistrictCode', authenticateToken, (req, res) => {
  const { DistrictCode } = req.params;
  const { districtName, stateCode, stdCode, UserID } = req.body;

  const query = `
      UPDATE DistrictMaster
      SET DistrictName=N'${districtName}', StateCode='${stateCode}', STDCode='${stdCode}', UserID='${UserID}'
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


app.post('/api/PostDistrictMaster', authenticateToken, (req, res) => {
  const { DistrictCode, DistrictName, StateCode, StdCode, UserID } = req.body
  const query = `INSERT INTO DistrictMaster (DistrictCode ,DistrictName, StateCode, STDCode, UserID) VALUES (${DistrictCode},N'${DistrictName}',${StateCode},'${StdCode}','${UserID}')`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Item created successfully' });
    }
  });
});

app.delete('/api/DeleteDistrictMaster/:DistrictCode', authenticateToken, authenticateToken, async (req, res) => {
  const { DistrictCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM DistrictMaster WHERE DistrictCode='${DistrictCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'District deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For GSTRate
// API to get all GSTRates
app.get('/api/gstrates', authenticateToken, (req, res) => {
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
app.post('/api/gstrates', authenticateToken, (req, res) => {
  const { GSTRateCode, GSTName, GSTPercent, CGSTPercent, SGSTPercent, IGSTPercent, Remark, UserID } = req.body;
  const query = `
      INSERT INTO GSTRatesMaster (GSTRateCode, GSTName, GSTPercent, CGSTPercent, SGSTPercent, IGSTPercent, Remark, UserID)
      VALUES ('${GSTRateCode}', N'${GSTName}', '${GSTPercent}', '${CGSTPercent}', '${SGSTPercent}', '${IGSTPercent}', '${Remark}','${UserID}');
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
app.put('/api/gstrates/:gstrateId', authenticateToken, (req, res) => {
  const { gstrateId } = req.params;
  const { GSTName, GSTPercent, CGSTPercent, SGSTPercent, IGSTPercent, Remark, UserID } = req.body;
  const query = `
      UPDATE GSTRatesMaster
      SET GSTName=N'${GSTName}', GSTPercent='${GSTPercent}', CGSTPercent='${CGSTPercent}',
          SGSTPercent='${SGSTPercent}', IGSTPercent='${IGSTPercent}', Remark=N'${Remark}', UserID='${UserID}'
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
app.delete('/api/gstrates/:gstrateId', authenticateToken, authenticateToken, async (req, res) => {
  const { gstrateId } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM GSTRatesMaster WHERE GSTRateCode='${gstrateId}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'GSTRate deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



//For itemcategories
app.get('/api/itemcategories', authenticateToken, (req, res) => {
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

app.post('/api/itemcategories', authenticateToken, (req, res) => {
  const {
    ItemCategoryCode,
    ItemCategoryName,
    ItemCategoryNameEng,
    ItemSubGroupCode,
    UserID
  } = req.body;
  const query = `
      INSERT INTO ItemCategoryMaster (ItemCategoryCode, ItemCategoryName, ItemCategoryNameEng, ItemSubGroupCode,UserID)
      VALUES ('${ItemCategoryCode}', N'${ItemCategoryName}', N'${ItemCategoryNameEng}', '${ItemSubGroupCode}','${UserID}');
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

app.put('/api/itemcategories/:itemCategoryId', authenticateToken, (req, res) => {
  const { itemCategoryId } = req.params;
  const {
    ItemCategoryName,
    ItemCategoryNameEng,
    ItemSubGroupCode,
    UserID
  } = req.body;
  const query = `
      UPDATE ItemCategoryMaster
      SET ItemCategoryName=N'${ItemCategoryName}', ItemCategoryNameEng=N'${ItemCategoryNameEng}', ItemSubGroupCode='${ItemSubGroupCode}',UserID='${UserID}'
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
          UserID
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

app.delete('/api/itemcategories/:itemCategoryId', authenticateToken, async (req, res) => {
  const { itemCategoryId } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM ItemCategoryMaster WHERE ItemCategoryCode='${itemCategoryId}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Item category deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/itemcategories/:itemCategoryId', authenticateToken, (req, res) => {
//   const { itemCategoryId } = req.params;
//   const query = `DELETE FROM ItemCategoryMaster WHERE ItemCategoryCode='${itemCategoryId}'`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Item category deleted successfully' });
//     }
//   });
// });

// For ItemGroupMaster
app.get('/api/item-groups', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM ItemGroupMaster ORDER BY ItemGroupCode ASC';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/item-groups', authenticateToken, (req, res) => {
  const { ItemGroupCode, ItemGroupName, ItemGroupNameEnglish, Remark1, Remark2, USERID } = req.body;
  const query = `
        INSERT INTO ItemGroupMaster (ItemGroupCode, ItemGroupName, ItemGroupNameEnglish, Remark1, Remark2, USERID)
        VALUES ('${ItemGroupCode}', N'${ItemGroupName}', N'${ItemGroupNameEnglish}', N'${Remark1}', N'${Remark2}', '${USERID}');
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

app.put('/api/item-groups/:ItemGroupCode', authenticateToken, (req, res) => {
  const { ItemGroupCode } = req.params;
  const { ItemGroupName, ItemGroupNameEnglish, Remark1, Remark2, USERID } = req.body;
  const query = `
        UPDATE ItemGroupMaster 
        SET ItemGroupName=N'${ItemGroupName}', ItemGroupNameEnglish=N'${ItemGroupNameEnglish}', 
        Remark1=N'${Remark1}', Remark2=N'${Remark2}', USERID='${USERID}'
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

app.delete('/api/item-groups/:ItemGroupCode', authenticateToken, async (req, res) => {
  const { ItemGroupCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM ItemGroupMaster WHERE ItemGroupCode='${ItemGroupCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Item group deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// For ItemMaster
app.get('/api/items-master', authenticateToken, (req, res) => {
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

app.post('/api/items-master', authenticateToken, (req, res) => {
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
    GstRateCode,
    Remark1,
    Remark2,
    Remark3,
    Remark4,
    Remark5,
    USERID
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
      '${HSNCODE}', ${GstRateCode}, N'${Remark1}', N'${Remark2}', N'${Remark3}', 
      N'${Remark4}', N'${Remark5}', '${USERID}'
      );
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
      console.log('USERID:', USERID);
    } else {
      res.json({ message: 'Item created successfully' });
      console.log('USERID:', USERID);
    }
  });
});

app.put('/api/items-master/:itemId', authenticateToken, (req, res) => {
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
    GstRateCode,
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
      HSNCODE='${HSNCODE}', GSTRATECODE=${GstRateCode}, Remark1=N'${Remark1}',
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
          GstRateCode,
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

app.delete('/api/items-master/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM ItemMaster WHERE ItCode='${itemId}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Item deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//For ItemSubGroupMaster
app.get('/api/itemsubgroups', authenticateToken, (req, res) => {
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

app.post('/api/itemsubgroups', authenticateToken, (req, res) => {
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

app.put('/api/itemsubgroups/:ItemSubGroupCode', authenticateToken, (req, res) => {
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
      console.log('Result:', result);
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'ItemSubGroup updated successfully',
          ItemSubGroupCode: ItemSubGroupCode,
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

app.delete('/api/itemsubgroups/:itemSubGroupCode', authenticateToken, async (req, res) => {
  const { itemSubGroupCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.error('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM ItemSubGroupMaster WHERE ItemSubGroupCode='${itemSubGroupCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.error('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'ItemSubGroup deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For LedgerMaster
// Get all LedgerMaster entries
app.get('/api/ledger-master', authenticateToken, (req, res) => {
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
app.post('/api/ledger-master', authenticateToken, (req, res) => {
  const {
    AcCode,
    AcGroupCode,
    AcHead,
    AcHeadEng,
    DetailYN,
    Address1,
    Address2,
    City,
    MobileNo,
    Email,
    AadharCardNo,
    PanNo,
    GSTNo,
    Remark1,
    Remark2,
    Remark3,
    Remark4,
    Remark5,
    UserID
  } = req.body;

  const query = `
        INSERT INTO LedgerMaster (
        AcCode,
        AcGroupCode,
        AcHead,
        AcHeadEng,
        DetailYN,
        Address1,
        Address2,
        City,
        MobileNo,
        Email,
        AadharCardNo,
        PANo,
        GSTNo,
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
          N'${DetailYN}',
          N'${Address1}',
          N'${Address2}',
          N'${City}',
          '${MobileNo}',
          '${Email}',
          '${AadharCardNo}',
          '${PanNo}',
          '${GSTNo}',
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
app.put('/api/ledger-master/:AcCode', authenticateToken, (req, res) => {
  const { AcCode } = req.params;
  const {
    AcGroupCode,
    AcHead,
    AcHeadEng,
    DetailYN,
    Address1,
    Address2,
    City,
    MobileNo,
    Email,
    AadharCardNo,
    PanNo,
    GSTNo,
    Remark1,
    Remark2,
    Remark3,
    Remark4,
    Remark5,
    UserID
  } = req.body;

  const query = `
        UPDATE LedgerMaster
        SET
          AcGroupCode='${AcGroupCode}',
          AcHead=N'${AcHead}',
          AcHeadEng=N'${AcHeadEng}',
          DetailYN=N'${DetailYN}',
          Address1=N'${Address1}',
          Address2=N'${Address2}',
          City=N'${City}',
          MobileNo='${MobileNo}',
          Email='${Email}',
          AadharCardNo='${AadharCardNo}',
          PANo=N'${PanNo}',
          GSTNo=N'${GSTNo}',
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
          DetailYN,
          Address1,
          Address2,
          City,
          MobileNo,
          Email,
          AadharCardNo,
          PanNo,
          GSTNo,
          Remark1,
          Remark2,
          Remark3,
          Remark4,
          Remark5,
          UserID

        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

app.delete('/api/ledger-master/:AcCode', authenticateToken, async (req, res) => {
  const { AcCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM LedgerMaster WHERE AcCode='${AcCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Ledger entry deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For Location master

// GET endpoint to fetch all locations
app.get('/api/locations', authenticateToken, (req, res) => {
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
app.post('/api/locations', authenticateToken, (req, res) => {
  const { LocationCode, LocationName, UserID } = req.body;
  const query = `
      INSERT INTO LocationMaster (LocationCode, LocationName,UserID)
      VALUES (N'${LocationCode}', N'${LocationName}','${UserID}');
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
app.put('/api/locations/:locationCode', authenticateToken, (req, res) => {
  const { locationCode } = req.params;
  const { LocationName, UserID } = req.body;
  const query = `
      UPDATE LocationMaster
      SET LocationName=N'${LocationName}',UserID='${UserID}'
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

app.delete('/api/locations/:locationCode', authenticateToken, async (req, res) => {
  const { locationCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM LocationMaster WHERE LocationCode='${locationCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Location deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// for narration 

app.get('/api/narrations', authenticateToken, (req, res) => {
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

app.post('/api/narrations', authenticateToken, (req, res) => {
  const {
    Srno,
    Narration,
    Narration1,
    UserID
  } = req.body;
  const query = `
        INSERT INTO NarrationMaster (Srno, Narration, Narration1,UserID)
        VALUES ('${Srno}', N'${Narration}', N'${Narration1}','${UserID}');
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

app.put('/api/narrations/:narrationId', authenticateToken, (req, res) => {
  const { narrationId } = req.params;
  const {
    Narration,
    Narration1,
    UserID
  } = req.body;
  const query = `
        UPDATE NarrationMaster
        SET Narration=N'${Narration}', Narration1=N'${Narration1}',UserID='${UserID}'
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

app.delete('/api/narrations/:narrationId', authenticateToken, async (req, res) => {
  const { narrationId } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM NarrationMaster WHERE Srno='${narrationId}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Narration deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For PackingMaster
app.get('/api/packing', authenticateToken, (req, res) => {
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

app.post('/api/packing', authenticateToken, (req, res) => {
  const { PackingCode, PackingName, ConversionFactor, UserID } = req.body;
  const query = `
      INSERT INTO PackingMaster (PackingCode, PackingName, ConversionFactor,UserID)
      VALUES ('${PackingCode}', N'${PackingName}', '${ConversionFactor}','${UserID}');
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

app.put('/api/packing/:packingCode', authenticateToken, (req, res) => {
  const { packingCode } = req.params;
  const { PackingName, ConversionFactor, UserID } = req.body;
  const query = `
      UPDATE PackingMaster
      SET PackingName=N'${PackingName}', ConversionFactor='${ConversionFactor}', UserID='${UserID}'
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

app.delete('/api/packing/:packingCode', authenticateToken, async (req, res) => {
  const { packingCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM PackingMaster WHERE PackingCode='${packingCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Packing item deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// for statemaster 
// Get all states
app.get('/api/states', authenticateToken, (req, res) => {
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
app.post('/api/states', authenticateToken, (req, res) => {
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
app.put('/api/states/:stateCode', authenticateToken, (req, res) => {
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

app.delete('/api/states/:stateCode', authenticateToken, async (req, res) => {
  const { stateCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM StateMaster WHERE StateCode='${stateCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'State deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET SubLedgerGroupMaster entries
app.get('/api/subledgergroups', authenticateToken, (req, res) => {
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
app.post('/api/subledgergroups', authenticateToken, (req, res) => {
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
app.put('/api/subledgergroups/:subledgergroupId', authenticateToken, (req, res) => {
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

app.delete('/api/subledgergroups/:subledgergroupId', authenticateToken, async (req, res) => {
  const { subledgergroupId } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM SubLedgerGroupMaster WHERE SubLedgerGroupCode='${subledgergroupId}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'SubLedgerGroup deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//subledgermaster

// GET SubLedgerGroupMaster entries
app.get('/api/subledgerMaster', authenticateToken, (req, res) => {
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
app.post('/api/subledgerMaster', authenticateToken, (req, res) => {
  const {
    SubAcCode,
    SubLedgerGroupCode,
    SubSrNo,
    SubAcHead,
    SubAcHeadEng,
    Address1,
    Address2,
    StateCode,
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
        Address1, Address2, StateCode, PhoneNo, MobileNo, Email, AadharCardNo, BankName, BankAcNo,
        PANo, GSTNO, Remark1, Remark2, Remark3, StatusCode, USERID)
      VALUES ('${SubAcCode}', '${SubLedgerGroupCode}', '${SubSrNo}', N'${SubAcHead}', '${SubAcHeadEng}',
        N'${Address1}', N'${Address2}', '${StateCode}', '${PhoneNo}', '${MobileNo}', '${Email}',
        '${AadharCardNo}', N'${BankName}', '${BankAcNo}', '${PANo}', '${GSTNO}', N'${Remark1}',
        N'${Remark2}', N'${Remark3}', '${StatusCode}', N'${USERID}');
    `;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'SubLedgerMaster created successfully' });
      console.log('query:', query);
    }
  });
});

// Update a SubLedgerMaster by SubAcCode
app.put('/api/subledgerMaster/:SubAcCode', authenticateToken, (req, res) => {
  const { SubAcCode } = req.params;
  const {
    SubLedgerGroupCode,
    SubSrNo,
    SubAcHead,
    SubAcHeadEng,
    Address1,
    Address2,
    StateCode,
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
      StateCode='${StateCode}', PhoneNo='${PhoneNo}', MobileNo='${MobileNo}', Email='${Email}',
      AadharCardNo='${AadharCardNo}', BankName=N'${BankName}', BankAcNo='${BankAcNo}', PANo='${PANo}',
      GSTNO='${GSTNO}', Remark1=N'${Remark1}', Remark2=N'${Remark2}', Remark3=N'${Remark3}',
      StatusCode=${StatusCode}, USERID='${USERID}'
      WHERE SubAcCode='${SubAcCode}';
  `;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);

      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'SubLedgerMaster updated successfully',
          SubAcCode,
          // ... (other fields)
        });
        console.log('query:', query);

      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});


app.delete('/api/subledgerMaster/:SubAcCode', authenticateToken, async (req, res) => {
  const { SubAcCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM SubLedgerMaster WHERE SubAcCode='${SubAcCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'SubLedgerMaster deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



//taluka master 
// Get all Talukas
app.get('/api/talukas', authenticateToken, (req, res) => {
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
app.post('/api/talukas', authenticateToken, (req, res) => {
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
app.put('/api/talukas/:talukaId', authenticateToken, (req, res) => {
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
app.delete('/api/talukas/:talukaId', authenticateToken, async (req, res) => {
  const { talukaId } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TalukaMaster WHERE TalukaCode='${talukaId}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Taluka deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//TranGroupMaster entries
// GET all TranGroupMaster entries
app.get('/api/trangroups', authenticateToken, (req, res) => {
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
app.post('/api/trangroups', authenticateToken, (req, res) => {
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
app.put('/api/trangroups/:acGroupCode', authenticateToken, (req, res) => {
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
app.delete('/api/trangroups/:acGroupCode', authenticateToken, async (req, res) => {
  const { acGroupCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranGroupMaster WHERE AcGroupCode='${acGroupCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'TranGroup deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//TranItMaster entries
// Get all TranItMaster entries
app.get('/api/tranItMaster', authenticateToken, (req, res) => {
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
app.post('/api/tranItMaster', authenticateToken, (req, res) => {
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
    UserID
  } = req.body;
  const query = `
      INSERT INTO TranItMaster (YearCode, DeptCode, ItCode, Rate, OpQty, OpWt, OpAmt, ClQty, ClWt, ClAmt,UserID)
      VALUES ('${YearCode}', '${DeptCode}', '${ItCode}', '${Rate}', '${OpQty}', '${OpWt}', '${OpAmt}', '${ClQty}', '${ClWt}', '${ClAmt}','${UserID}');
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
app.put('/api/tranItMaster/:DeptCode/:ItCode', authenticateToken, (req, res) => {
  const { DeptCode, ItCode } = req.params;
  const {
    YearCode,
    Rate,
    OpQty,
    OpWt,
    OpAmt,
    ClQty,
    ClWt,
    ClAmt,
    UserID
  } = req.body;
  const query = `
      UPDATE TranItMaster
      SET YearCode='${YearCode}', DeptCode='${DeptCode}', ItCode='${ItCode}', Rate='${Rate}', 
          OpQty='${OpQty}', OpWt='${OpWt}', OpAmt='${OpAmt}', ClQty='${ClQty}', ClWt='${ClWt}', ClAmt='${ClAmt}',UserID='${UserID}'
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
app.delete('/api/tranItMaster/:DeptCode/:ItCode', authenticateToken, async (req, res) => {
  const { DeptCode, ItCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranItMaster WHERE DeptCode='${DeptCode}' AND ItCode='${ItCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'TranItMaster deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



//TranLedgerMaster
// GET all TranLedgerMaster entries
app.get('/api/tranledgers1', authenticateToken, (req, res) => {
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
app.post('/api/tranledgers1', authenticateToken, (req, res) => {
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
app.put('/api/tranledgers1/:AcCode', authenticateToken, (req, res) => {
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
      DeptCode='${DeptCode}', YearCode='${YearCode}', UserID=''${UserID}''
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
app.delete('/api/tranledgers1/:AcCode', authenticateToken, async (req, res) => {
  const { AcCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranLedgerMaster WHERE AcCode='${AcCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'TranLedger deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//TranLedgerMasterTemp

// Get all ledger entries
app.get('/api/ledgerentries', authenticateToken, (req, res) => {
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
app.post('/api/ledgerentries', authenticateToken, (req, res) => {
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
app.put('/api/ledgerentries/:acCode', authenticateToken, (req, res) => {
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
app.delete('/api/ledgerentries/:acCode', authenticateToken, async (req, res) => {
  const { acCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranLedgerMasterTemp WHERE AcCode=${acCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Ledger entry deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//TranSubLedger entries
// Get all TranSubLedger entries
app.get('/api/tranSubLedgers1', authenticateToken, (req, res) => {
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
app.post('/api/tranSubLedgers1', authenticateToken, (req, res) => {
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
app.put('/api/tranSubLedgers1/:acCode', authenticateToken, (req, res) => {
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
app.delete('/api/tranSubLedgers1/:acCode', authenticateToken, async (req, res) => {
  const { acCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranSubLedgerMaster WHERE AcCode='${acCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'TranSubLedger deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//TranSubLedgerMasterTemp
// GET all TranSubLedgerMasterTemp entries
app.get('/api/entries', authenticateToken, (req, res) => {
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
app.post('/api/entries', authenticateToken, (req, res) => {
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
app.put('/api/entries/:entryId', authenticateToken, (req, res) => {
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
app.delete('/api/entries/:entryId', authenticateToken, async (req, res) => {
  const { entryId } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranSubLedgerMasterTemp WHERE AcCode='${entryId}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'TranSubLedgerMasterTemp entry deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// For UnitMaster------------------------------------------------------------------------------------

// GET all units
app.get('/api/units', authenticateToken, (req, res) => {
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
app.post('/api/units', authenticateToken, (req, res) => {
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
app.put('/api/units/:unitId', authenticateToken, (req, res) => {
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
app.delete('/api/units/:unitId', authenticateToken, async (req, res) => {
  const { unitId } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM UnitMaster WHERE UnitId='${unitId}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Unit deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/units/:unitId', authenticateToken, (req, res) => {
//   const { unitId } = req.params;
//   const query = `DELETE FROM UnitMaster WHERE UnitId='${unitId}'`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Unit deleted successfully' });
//     }
//   });
// }); 

//VibhagMasters
// GET all VibhagMasters
app.get('/api/vibhags', authenticateToken, (req, res) => {
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
app.post('/api/vibhags', authenticateToken, (req, res) => {
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
app.put('/api/vibhags/:vibhagCode', authenticateToken, (req, res) => {
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
app.delete('/api/vibhags/:vibhagCode', authenticateToken, async (req, res) => {
  const { vibhagCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM VibhagMaster WHERE VibhagCode='${vibhagCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'VibhagMaster deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/vibhags/:vibhagCode', authenticateToken, (req, res) => {
//   const { vibhagCode } = req.params;
//   const query = `DELETE FROM VibhagMaster WHERE VibhagCode='${vibhagCode}'`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'VibhagMaster deleted successfully' });
//     }
//   });
// });


//villages  ------------------------------------------------------------------------------------
// GET all villages
app.get('/api/villages', authenticateToken, (req, res) => {
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
app.post('/api/villages', authenticateToken, (req, res) => {
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
app.put('/api/villages/:villageId', authenticateToken, (req, res) => {
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
app.delete('/api/villages/:villageId', authenticateToken, async (req, res) => {
  const { villageId } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM VillageMaster WHERE VillageCode='${villageId}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Village deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/villages/:villageId', authenticateToken, (req, res) => {
//   const { villageId } = req.params;
//   const query = `DELETE FROM VillageMaster WHERE VillageCode='${villageId}'`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Village deleted successfully' });
//     }
//   });
// });


// For Year Master  ------------------------------------------------------------------------------------

app.get('/api/year_master', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM YearMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/year_master', authenticateToken, (req, res) => {
  const { YearCode, StartYear, EndYear, FinancialYear, DeptCode, CompCode } = req.body
  const query = `INSERT INTO YearMaster (YearCode, StartYear , EndYear , FinancialYear , DeptCode ,  CompCode ) VALUES ('${YearCode}','${StartYear}','${EndYear}','${FinancialYear}', '${DeptCode}' ,  '${CompCode}')`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Year created successfully' });
    }
  });
});

app.put('/api/year_master/:YearCode', authenticateToken, (req, res) => {
  const { YearCode } = req.params;
  const { StartYear, EndYear, FinancialYear, DeptCode, CompCode } = req.body
  const query = `UPDATE YearMaster SET StartYear='${StartYear}', EndYear='${EndYear}', FinancialYear=N'${FinancialYear}', DeptCode=N'${DeptCode}', CompCode=N'${CompCode}' WHERE YearCode='${YearCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('error:', err);
      res.status(500).json({ error: 'internal server error' });
    } else {
      res.json({ message: 'Year created successfully' });
    }
  });
});

app.delete('/api/year_master/:YearCode', authenticateToken, async (req, res) => {
  const { YearCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM YearMaster WHERE YearCode=${YearCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Year deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/year_master/:YearCode', (req,res)=>{
//   const { YearCode } = req.params;
//   //console.log("Comp Code  ",CompCode);
//   const query = `DELETE FROM YearMaster WHERE YearCode=${YearCode}`;
//   sql.query(query,(err) => {
//       if (err) {
//         console.log('Error:', err);
//         res.status(500).json({ error: 'Internal server error' });
//       } else {
//         res.json({ message: 'Year deleted successfully' });
//       }
//     });
// });


// For CompanyMaster  ------------------------------------------------------------------------------------

app.get('/api/company', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM CompanyMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/company', authenticateToken, (req, res) => {
  const { CompCode, CompName, CompAddress, CompAddress1, CompAddress2, CompCity, CompStateCode, CompGSTIN, CompPhone, CompEmail, Fax, WebSite, CompNarr1, CompNarr2 } = req.body
  const query = `INSERT INTO CompanyMaster (CompCode, CompName , CompAddress , CompAddress1 , CompAddress2 ,  CompCity , CompStateCode , CompGSTIN , CompPhone , CompEmail , Fax , WebSite , CompNarr1 , CompNarr2 ) VALUES ('${CompCode}',N'${CompName}',N'${CompAddress}',N'${CompAddress1}', N'${CompAddress2}' ,  N'${CompCity}' , N'${CompStateCode}',N'${CompGSTIN}',N'${CompPhone}',N'${CompEmail}',N'${Fax}', N'${WebSite}',N'${CompNarr1}',N'${CompNarr2}' )`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Company created successfully' });
    }
  });
});


app.put('/api/company/:CompCode', authenticateToken, (req, res) => {
  const { CompCode } = req.params;
  const { CompName, CompAddress, CompAddress1, CompAddress2, CompCity, CompStateCode, CompGSTIN, CompPhone, CompEmail, Fax, WebSite, CompNarr1, CompNarr2 } = req.body
  const query = `UPDATE CompanyMaster SET CompName=N'${CompName}', CompAddress=N'${CompAddress}', CompAddress1=N'${CompAddress1}', CompAddress2=N'${CompAddress2}', CompCity=N'${CompCity}', CompStateCode='${CompStateCode}', CompGSTIN='${CompGSTIN}', CompPhone='${CompPhone}', CompEmail='${CompEmail}', Fax='${Fax}', WebSite='${WebSite}', CompNarr1='${CompNarr1}', CompNarr2='${CompNarr2}' WHERE CompCode='${CompCode}';`;
  sql.query(query, (err) => {
    if (err) {
      console.log('error:', err);
      res.status(500).json({ error: 'internal server error' });
    } else {
      res.json({ message: 'Company created successfully' });
    }
  });
});

app.delete('/api/company/:CompCode', authenticateToken, async (req, res) => {
  const { CompCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM CompanyMaster WHERE CompCode=${CompCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Company deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/company/:CompCode', (req,res)=>{
//   const { CompCode } = req.params;
//   //console.log("Comp Code  ",CompCode);
//   const query = `DELETE FROM CompanyMaster WHERE CompCode=${CompCode}`;
//   sql.query(query,(err) => {
//       if (err) {
//         console.log('Error:', err);
//         res.status(500).json({ error: 'Internal server error' });
//       } else {
//         res.json({ message: 'Company deleted successfully' });
//       }
//     });
// });


// TranEntry API    ------------------------------------------------------------------------------------

app.get('/api/distinct-tranentries/:flag/:dept/:year/:company', authenticateToken, (req, res) => {
  const { flag, dept, year, company } = req.params;
  const query = `
      SELECT * 
      FROM TranEntry
      WHERE Flag = @flag
        AND DeptCode = @dept
        AND YearCode = @year
        AND CompCode = @company`;

  const request = new sql.Request();
  request.input('flag', sql.NVarChar, flag);
  request.input('dept', sql.NVarChar, dept);
  request.input('year', sql.NVarChar, year);
  request.input('company', sql.NVarChar, company);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// app.get('/api/tranentries/:flag/:dept/:year/:company', authenticateToken, (req, res) => {
//   const { flag, dept, year, company } = req.params;
//   // Modify the query to select a specific entry number and consider the "flag"
//   const query = `
//     SELECT *
//     FROM TranEntry
//     WHERE Flag = @flag
//       AND DeptCode = @dept
//       AND YearCode = @year
//       AND CompCode = @company`;

//   const request = new sql.Request();
//   request.input('flag', sql.NVarChar, flag);
//   request.input('dept', sql.NVarChar, dept);
//   request.input('year', sql.NVarChar, year);
//   request.input('company', sql.NVarChar, company);

//   request.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json(result.recordset);
//     }
//   });
// });

app.get('/api/tranNewEntries', authenticateToken, (req, res) => {
  const { UserId } = req.query;
  const query = `select * from TranEntryTempSub WHERE UserId='${UserId}'`;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
})



app.post('/api/Savetranentries', authenticateToken, async (req, res) => {
  const { flag, DeptCode, YearCode, CompCode, entryNo, operation, requestData, TrDate, CashOrTr } = req.body;

  const getMaxEntryNoQuery = `
    SELECT MAX(CAST(EntryNo AS INT)) AS MaxEntryNo
    FROM TranEntry
    WHERE Flag = '${flag}'AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND CompCode = ${CompCode}`;
  console.log("getMaxEntryNoQuery", getMaxEntryNoQuery);
  const maxEntryNoResult = await sql.query(getMaxEntryNoQuery);
  const maxEntryNo = maxEntryNoResult.recordset[0]?.MaxEntryNo || 0;
  console.log("maxEntryNo", maxEntryNo);
  console.log("maxEntryNo", maxEntryNo + 1);

  const values = requestData.map(entry => `(
      '${operation === 'update' ? entry.EntryNo : maxEntryNo + 1}', 
      '${TrDate}', 
      '${entry.Flag}',
      '${entry.AcCode}',
      '${entry.SubAcCode}',
      ${entry.CrAmt},
      ${entry.DrAmt},
      '${entry.ChqNo || 0}',
      N'${entry.Narration1}',
      N'${entry.Narration2}',
      N'${entry.Narration3}',
      ${entry.SubLedgerGroupCode},
      '${entry.DeptCode}',
      '${entry.YearCode}',
      '${entry.CompCode}',
      '${entry.UserID}',
      '${CashOrTr}',
      '${entry.uniqueCode ? entry.uniqueCode : entry.COMPUTERID}'
      )`).join(',');
  // Assuming you have access to a SQL instance through a 'sql' object
  const query = `
    DELETE TE
    FROM TranEntry AS TE
    WHERE TE.EntryNo = ${operation === 'update' ? entryNo : maxEntryNo + 1} AND TE.Flag = '${flag}' AND TE.DeptCode = '${DeptCode}' AND TE.YearCode = '${YearCode}'  AND TE.CompCode = '${CompCode}';

      INSERT INTO TranEntry (
        EntryNo,
        TrDate,
        Flag,
        AcCode,
        SubAcCode,
        CrAmt,
        DrAmt,
        ChqNo,
        Narration1,
        Narration2,
        Narration3,
        SubLedgerGroupCode,
        DeptCode,
        YearCode,
        CompCode,
        UserID,
        CashOrTr,
        COMPUTERID
      ) VALUES ${values};`;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});


app.post('/api/tranentriesPost', authenticateToken, (req, res) => {
  const {
    entryNo,
    trDate,
    acCode,
    subLedgerGrpCode,
    subAcCode,
    crAmt,
    drAmt,
    chqNo,
    narration1,
    DeptCode,
    YearCode,
    CompCode,
    UserID,
    flag,
    uniqueCode
  } = req.body;

  let query = `
      INSERT INTO TranEntryTempSub (EntryNo, TrDate, Flag, AcCode, SubLedgerGroupCode, SubAcCode, CrAmt, DrAmt, DeptCode, YearCode, CompCode, UserID , COMPUTERID`;

  // Conditionally add chqNo to the SQL query if it's provided
  if (chqNo) {
    query += ', ChqNo';
  }

  // Conditionally add narration1 to the SQL query if it's provided
  if (narration1) {
    query += ', Narration1';
  }

  query += `)
      VALUES ('${entryNo}', '${trDate}', '${flag}', '${acCode}', '${subLedgerGrpCode}', '${subAcCode}', '${crAmt}', '${drAmt}',${DeptCode},${YearCode},${CompCode},'${UserID}',${uniqueCode}`;

  // Conditionally add the values for chqNo and narration1
  if (chqNo) {
    query += `, '${chqNo}'`;
  } else {
    query += ', null';
  }

  if (narration1) {
    query += `, '${narration1}'`;
  } else {
    query += ', null';
  }

  query += ');';

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
      console.log('query:', query);
    }
  });
});

app.put('/api/tranentries/:uniqueCode', authenticateToken, (req, res) => {
  const { uniqueCode } = req.params;
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
    DeptCode,
    YearCode,
    CompCode,
    UserID
  } = req.body;
  const query = `
      UPDATE TranEntry
      SET TrDate='${TrDate}', Flag='${Flag}', AcCode='${AcCode}', SubLedgerGroupCode='${SubLedgerGroupCode}', SubAcCode='${SubAcCode}', CrAmt='${CrAmt}', DrAmt='${DrAmt}', ChqNo='${ChqNo}', Narration1=N'${Narration1}', Narration2=N'${Narration2}', Narration3=N'${Narration3}',
      DeptCode=${DeptCode},YearCode=${YearCode} ,CompCode=${CompCode} ,UserID='${UserID}' WHERE COMPUTERID='${uniqueCode}';
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


app.put('/api/Newtranentries/:uniqueCode/:UserID', authenticateToken, (req, res) => {
  const { uniqueCode, UserID } = req.params;
  const {
    entryNo,
    trDate,
    flag,
    acCode,
    subLedgerGrpCode,
    subAcCode,
    crAmt,
    drAmt,
    chqNo,
    narration1,
    narration2,
    narration3,
  } = req.body;

  // Check if the ID exists in TranEntry
  const queryCheckTranEntry = `SELECT COUNT(*) AS count FROM TranEntry WHERE COMPUTERID=${uniqueCode} AND UserID='${UserID}'`;
  sql.query(queryCheckTranEntry, (err) => {
    if (err) {
      console.log('Error checking TranEntry:', err);
      return res.status(500).json({ error: 'Internal server error for TranEntry check' });
    }
    const updateQuery = `
          UPDATE TranEntryTempSub
          SET TrDate='${trDate}', Flag='${flag}', AcCode='${acCode}', SubLedgerGroupCode='${subLedgerGrpCode}', SubAcCode='${subAcCode}', CrAmt='${crAmt}', DrAmt='${drAmt}'${chqNo ? `, ChqNo='${chqNo}'` : ''}${narration1 ? `, Narration1='${narration1}'` : ''} WHERE COMPUTERID=${uniqueCode};`;
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
          subLedgerGrpCode,
          subAcCode,
          crAmt,
          drAmt,
          chqNo,
          narration1,
          narration2,
          narration3,
        });
      } else {
        return res.status(404).json({ error: 'Record not found for the specified ID', uniqueCode });
      }
    });
  });
});

app.delete('/api/tranentries/:entryNo/:flag', authenticateToken, async (req, res) => {
  const { entryNo, flag } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranEntry WHERE EntryNo=${entryNo} AND Flag='${flag}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'TranEntry deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.delete('/api/Newtranentries/:uniqueCode/:UserID', authenticateToken, async (req, res) => {
  const { uniqueCode, UserID } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranEntryTempSub WHERE COMPUTERID='${uniqueCode}' AND UserID='${UserID}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'BillSubTemp deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.post('/api/tranEntry-insertDataAndFlag', authenticateToken, (req, res) => {
  const entryNo = req.body.entryNo;
  const flag = req.body.flag;
  const query = `
      DELETE FROM TranEntryTempSub;
      INSERT INTO TranEntryTempSub (EntryNo, TrDate, Flag, AcCode, SubLedgerGroupCode, SubAcCode, CrAmt, DrAmt, DeptCode, YearCode, CompCode, UserID,COMPUTERID,ChqNo,Narration1)
      SELECT EntryNo, TrDate, Flag, AcCode, SubLedgerGroupCode, SubAcCode, CrAmt, DrAmt, DeptCode, YearCode, CompCode, UserID,COMPUTERID,ChqNo,Narration1
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




app.delete('/api/cleartranEntryTemp', authenticateToken, (req, res) => {
  const UserID = req.body.UserID; // Fix: Use req.body.UserID

  const query = `
      DELETE FROM TranEntryTempSub WHERE UserID='${UserID}';
    `;

  const request = new sql.Request();
  request.input('UserID', sql.VarChar, UserID);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});


//Billsub Entry ------------------------------------------------------------------------------------

app.post('/api/SaveBillentries', authenticateToken, async (req, res) => {
  const { flag, DeptCode, YearCode, CompCode, trDate, AcCode, BillNo, BillDate, Desc1, Desc2, operation, entryNo, RoundOff, TotNetAmt, TotIGST, TotCGST, TotSGST, GrossTotAmt, UserID } = req.body;
  // Get the latest max entry number for the given flag
  const getMaxEntryNoQuery = `
      SELECT MAX(ENTRYNO) AS MaxEntryNo
      FROM Billsub
      WHERE Flag = '${flag}'AND DeptCode = '${DeptCode}'AND YearCode = '${YearCode}' AND CompCode = '${CompCode}'`;
  console.log("getMaxEntryNoQuery", getMaxEntryNoQuery);
  const maxEntryNoResult = await sql.query(getMaxEntryNoQuery);
  const maxEntryNo = maxEntryNoResult.recordset[0]?.MaxEntryNo || 0;
  console.log("maxEntryNo", maxEntryNo);

  // SQL query to insert data into TranEntry and delete from TranEntryTempSub
  let query = `
      DELETE TE
      FROM Billsub AS TE
      WHERE TE.EntryNo = '${operation === 'update' ? entryNo : maxEntryNo + 1}' AND TE.Flag = '${flag}' AND TE.DeptCode = '${DeptCode}' AND TE.YearCode = '${YearCode}'  AND TE.CompCode = '${CompCode}';

      INSERT INTO Billsub (TRDATE, Flag, AcCode, ItCode, BillNo, BillDate, Desc1, Desc2, MRP, Qty, Rate, Amount, DiscAmt, TaxableAmt, GstRateCode, GstRate, CGstAmt, SGstAmt, IGstAmt, RoundOff, NetAmt, ENTRYNO, YearCode, DeptCode, CompCode, USERID, COMPUTERID)
      SELECT  
      '${trDate}',Flag,${AcCode},ItCode,'${BillNo}','${BillDate}','${Desc1}','${Desc2}', MRP,Qty,Rate,Amount,DiscAmt,TaxableAmt,GstRateCode,GstRate,CGstAmt,SGstAmt,IGstAmt,RoundOff,
       NetAmt,'${operation === 'update' ? entryNo : maxEntryNo + 1}', YearCode,DeptCode,CompCode,USERID,COMPUTERID
      FROM BillsubTemp;

      DELETE TETS
      FROM BillsubTemp AS TETS
      WHERE TETS.EntryNo = '${operation === 'update' ? entryNo : maxEntryNo + 1}' AND TETS.Flag = '${flag}'AND TETS.DeptCode = '${DeptCode}' AND TETS.YearCode = '${YearCode}'  AND TETS.CompCode = '${CompCode}';
      
      delete from billentry where EntryNo = '${operation === 'update' ? entryNo : maxEntryNo + 1}' AND Flag = '${flag}' AND DeptCode = '${DeptCode}' AND YearCode = '${YearCode}'  AND CompCode = '${CompCode}';
        INSERT INTO BillEntry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, billno, billdate, TaxableAmt, CgstAmt, SgstAmt, IgstAmt, RoundOff, NetAmt)
        VALUES ('${CompCode}', '${DeptCode}', '${YearCode}', '${UserID}', '${flag}', '${operation === 'update' ? entryNo : maxEntryNo + 1}', '${trDate}', '${AcCode}', '${AcCode}', '${BillNo}',' ${BillDate}', '${GrossTotAmt}','${TotCGST}', '${TotSGST}','${TotIGST}','${RoundOff}', '${TotNetAmt}');`
  if (flag === 'S' || flag === 'PR') {
    // Additional code to run when flag is 'P' or 'S'
    query += `
          DELETE FROM Tranentry 
          WHERE EntryNo = '${operation === 'update' ? entryNo : maxEntryNo + 1}' AND Flag = '${flag}' AND DeptCode = '${DeptCode}' AND YearCode = '${YearCode}' AND CompCode = '${CompCode}';
    
          INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, DrAmt,CrAmt)
          VALUES ('${CompCode}', '${DeptCode}', '${YearCode}', '${UserID}', '${flag}', '${operation === 'update' ? entryNo : maxEntryNo + 1}', '${trDate}',15, '${AcCode}','${TotNetAmt}',0);
    
    
          INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, CrAmt,DrAmt)
          VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 4,0,'${GrossTotAmt}',0);
    
    
          INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, CrAmt,DrAmt)
          VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 7,0,'${TotCGST}',0);
    
    
          INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, CrAmt,DrAmt)
          VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 8,0,'${TotSGST}',0);
    
    
          INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, CrAmt,DrAmt)
          VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 9,0,'${TotIGST}',0);
          
          INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, DrAmt, CrAmt)
          VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 12,0,'${RoundOff < 0 ? -RoundOff : 0}','${RoundOff > 0 ? RoundOff : 0}');
          `;
  }
  if (flag === 'P' || flag === 'SR') {
    // Additional code to run when flag is 'P' or 'S'
    query += `
            DELETE FROM Tranentry 
            WHERE EntryNo = '${operation === 'update' ? entryNo : maxEntryNo + 1}' AND Flag = '${flag}' AND DeptCode = '${DeptCode}' AND YearCode = '${YearCode}' AND CompCode = '${CompCode}';
            
            INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, CrAmt,DrAmt)
            VALUES ('${CompCode}', '${DeptCode}', '${YearCode}', '${UserID}', '${flag}', '${operation === 'update' ? entryNo : maxEntryNo + 1}', '${trDate}', 16,'${AcCode}','${TotNetAmt}',0);
        
            
            INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, DrAmt,CrAmt)
            VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 3,0,'${GrossTotAmt}',0);
        
            
            INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, DrAmt,CrAmt)
            VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 7,0,'${TotCGST}',0);
        
            
            INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, DrAmt,CrAmt)
            VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 8,0,'${TotSGST}',0);
        
            
            INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, DrAmt,CrAmt)
            VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 9,0,'${TotIGST}',0);
        
            
            INSERT INTO Tranentry (CompCode, Deptcode, YearCode, UserId, flag, entryno, trdate, accode, subaccode, CrAmt, DrAmt)
            VALUES ('${CompCode}','${DeptCode}', '${YearCode}', '${UserID}', '${flag}','${operation === 'update' ? entryNo : maxEntryNo + 1}','${trDate}', 12,0,'${RoundOff < 0 ? -RoundOff : 0}','${RoundOff > 0 ? RoundOff : 0}');
            `;
  }
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved and deleted successfully' });
    }
  });
});

app.delete('/api/NewSelltries/:entryNo/:flag/:CompCode/:DeptCode/:YearCode', authenticateToken, async (req, res) => {
  const { entryNo, flag, CompCode, DeptCode, YearCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `
              DELETE FROM BillSub  WHERE EntryNo='${entryNo}' AND Flag='${flag}' AND CompCode=${CompCode} AND DeptCode=${DeptCode} AND YearCode=${YearCode};
              DELETE FROM BillEntry  WHERE EntryNo='${entryNo}' AND Flag='${flag}' AND CompCode=${CompCode} AND DeptCode=${DeptCode} AND YearCode=${YearCode};
              DELETE FROM TranEntry  WHERE EntryNo='${entryNo}' AND Flag='${flag}' AND CompCode=${CompCode} AND DeptCode=${DeptCode} AND YearCode=${YearCode};
            `;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Entries deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/distinct-sellentries/:flag/:dept/:year/:company', authenticateToken, (req, res) => {
  const flag = req.params.flag;
  const dept = req.params.dept;
  const year = req.params.year;
  const company = req.params.company;
  // Validate inputs and handle potential security concerns


  const query = `
      SELECT distinct ENTRYNO, BILLNO, TRDATE,FLAG,CompCode, BILLDATE ,ACCODE,DESC1,DESC2,NETAMT
      FROM Billsub
      WHERE Flag = @flag
        AND DeptCode = @dept
        AND YearCode = @year
        AND CompCode = @company;`;

  const request = new sql.Request();
  request.input('flag', sql.NVarChar, flag);
  request.input('dept', sql.NVarChar, dept);
  request.input('year', sql.NVarChar, year);
  request.input('company', sql.NVarChar, company);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/billsubtemp/:flag', authenticateToken, (req, res) => {
  const flag = req.params.flag; // Get the "flag" from the URL parameters


  // Modify the query to select a specific entry number and consider the "flag"
  const query = `
      SELECT *
      FROM BillsubTemp
      WHERE FLAG = @flag`; // Use parameterized query to avoid SQL injection

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

app.get('/api/sellentries/:entryNo/:flag', authenticateToken, (req, res) => {
  const entryNo = req.params.entryNo; // Get the entry number from the URL
  const flag = req.params.flag; // Get the "flag" from the URL parameters

  // Modify the query to select a specific entry number and consider the "flag"
  const query = `
      SELECT *
      FROM Billsub
      WHERE ENTRYNO = @entryNo AND FLAG = @flag`; // Use parameterized query to avoid SQL injection

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

app.post('/api/sellentriesPost', authenticateToken, (req, res) => {
  const {
    flag,
    entryNo,
    trDate,
    AcCode,
    ItCode,
    BillNo,
    BillDate,
    Desc1,
    Desc2,
    MRP,
    Qty,
    Rate,
    Amount,
    DiscAmt,
    TaxableAmt,
    GstRateCode,
    GstRate,
    CGstAmt,
    SGstAmt,
    IGstAmt,
    RoundOff,
    NetAmt,
    DeptCode,
    YearCode,
    CompCode,
    USERID,
    uniqueCode
  } = req.body;


  let query = `
      INSERT INTO BillsubTemp (flag, EntryNo, TrDate, AcCode, ItCode, BillNo, BillDate, Desc1, Desc2,  MRP, Qty, Rate, Amount, DiscAmt, TaxableAmt, GSTRateCode, GstRate, CGSTAmt, SGSTAmt, IGSTAmt, RoundOff, NetAmt, DeptCode, YearCode, CompCode, USERID, COMPUTERID) 
      VALUES ('${flag}','${entryNo}', '${trDate}', ${AcCode}, '${ItCode}','${BillNo}','${BillDate}',N'${Desc1}',N'${Desc2}',  '${MRP}', '${Qty}', '${Rate}', '${Amount}', '${DiscAmt}', '${TaxableAmt}', '${GstRateCode}','${GstRate}', '${CGstAmt}', '${SGstAmt}', '${IGstAmt}', '${RoundOff}','${NetAmt}','${DeptCode}','${YearCode}',${CompCode},'${USERID}',${uniqueCode})`;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.post('/api/insertDataAndFlag', authenticateToken, (req, res) => {
  const entryNo = req.body.entryNo;
  const flag = req.body.flag;
  const DeptCode = req.body.DeptCode;
  const YearCode = req.body.YearCode;
  const CompCode = req.body.CompCode;

  const query = `
      DELETE FROM BillsubTemp;

      INSERT INTO BillsubTemp (flag, EntryNo, TrDate, AcCode, ItCode, BillNo, BillDate, Desc1, Desc2,  MRP, Qty, Rate, Amount, DiscAmt, TaxableAmt, GSTRateCode, GstRate, CGSTAmt, SGSTAmt, IGSTAmt, RoundOff, NetAmt, DeptCode ,YearCode, USERID ,CompCode,COMPUTERID)
      SELECT flag, EntryNo, TrDate, AcCode, ItCode, BillNo, BillDate, Desc1, Desc2,  MRP, Qty, Rate, Amount, DiscAmt, TaxableAmt, GSTRateCode, GstRate, CGSTAmt, SGSTAmt, IGSTAmt, RoundOff, NetAmt, DeptCode , YearCode ,USERID ,CompCode,COMPUTERID
      FROM Billsub
      WHERE EntryNo = @entryNo AND Flag = @flag  AND DeptCode = @DeptCode  AND YearCode = @YearCode  AND CompCode = @CompCode;
    `;

  const request = new sql.Request();
  request.input('entryNo', sql.Int, entryNo);
  request.input('flag', sql.VarChar(255), flag);
  request.input('DeptCode', sql.Int, DeptCode);
  request.input('YearCode', sql.Int, YearCode);
  request.input('CompCode', sql.Int, CompCode);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.put('/api/NewSaleEntries/:entryNo/:uniqueCode/:flag', authenticateToken, (req, res) => {
  const { entryNo, flag, uniqueCode } = req.params;
  const {
    trDate,
    AcCode,
    ItCode,
    BillNo,
    BillDate,
    Desc1,
    Desc2,
    MRP,
    Qty,
    Rate,
    Amount,
    DiscAmt,
    TaxableAmt,
    GstRateCode,
    GstRate,
    CGstAmt,
    SGstAmt,
    IGstAmt,
    RoundOff,
    NetAmt,
    DeptCode
  } = req.body;

  // Always update TranEntryTempSub
  const updateQuery = `
      UPDATE BillSubTemp
      SET TrDate='${trDate}', AcCode='${AcCode}', ItCode='${ItCode}',BillNo='${BillNo}',BillDate='${BillDate}',Desc1='${Desc1}',Desc2='${Desc2}', MRP='${MRP}', Qty='${Qty}', Rate='${Rate}', Amount='${Amount}', DiscAmt='${DiscAmt}', TaxableAmt='${TaxableAmt}', GstRateCode='${GstRateCode}',GstRate='${GstRate}', CGstAmt='${CGstAmt}', SGstAmt='${SGstAmt}', IGstAmt='${IGstAmt}',RoundOff='${RoundOff}', NetAmt='${NetAmt}'  WHERE ENTRYNO=${entryNo} AND COMPUTERID=${uniqueCode} AND Flag='${flag}' ;`;

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
        AcCode,
        ItCode,
        BillNo,
        BillDate,
        Desc1,
        Desc2,
        MRP,
        Qty,
        Rate,
        Amount,
        DiscAmt,
        TaxableAmt,
        GstRateCode,
        GstRate,
        CGstAmt,
        SGstAmt,
        IGstAmt,
        RoundOff,
        NetAmt,
        DeptCode
      });
    } else {
      return res.status(404).json({ error: 'Record not found for the specified ID', entryNo, uniqueCode, flag });
    }
  });
});

app.delete('/api/billsubtempentries/:entryNo/:CompCode/:DeptCode/:YearCode', authenticateToken, (req, res) => {
  const { CompCode, DeptCode, YearCode, entryNo } = req.params;
  const query = `DELETE FROM BillSubTemp WHERE EntryNo=${entryNo} AND CompCode=${CompCode} AND DeptCode=${DeptCode} AND YearCode=${YearCode}`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'BillSubTemp deleted successfully' });
    }
  });
});

app.delete('/api/clearTemp', authenticateToken, (req, res) => {
  const query = `DELETE FROM BillSubTemp`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'BillSubTemp deleted successfully' });
    }
  });
});


//report of jasper ------------------------------------------------------------------------------------

app.get('/api/report/:paramCode', authenticateToken, async (req, res) => {
  const url = "http://localhost:8080/jasperserver/rest_v2/reports/reports/Customer.pdf";
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

// For CasteMaster------------------------------------------------------------------------------------

// GET all caste
app.get('/api/caste', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM CasteMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new caste
app.post('/api/caste', authenticateToken, (req, res) => {
  const { CasteCode, CasteName, UserID } = req.body;
  const query = `
      INSERT INTO CasteMaster (CasteCode, Caste, UserID)
      VALUES ('${CasteCode}', N'${CasteName}',  N'${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Caste created successfully' });
    }
  });
});

// PUT update an existing caste
app.put('/api/caste/:CasteCode', authenticateToken, (req, res) => {
  const { CasteCode } = req.params;
  const { CasteName, UserID } = req.body;
  const query = `
      UPDATE CasteMaster
      SET Caste=N'${CasteName}', UserID=N'${UserID}'
      WHERE CasteCode='${CasteCode}';
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Caste updated successfully',
          CasteCode: CasteCode,
          CasteName,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a caste
app.delete('/api/caste/:casteCode', authenticateToken, async (req, res) => {
  const { casteCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM CasteMaster WHERE CasteCode='${casteCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Caste deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/caste/:casteCode', authenticateToken, (req, res) => {
//   const { casteCode } = req.params;
//   const query = `DELETE FROM CasteMaster WHERE CasteCode='${casteCode}'`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Caste deleted successfully' });
//     }
//   });
// }); 

// For Qualification Master------------------------------------------------------------------------------------

// GET all Qual
app.get('/api/qual', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM QualificationMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new Qual
app.post('/api/qual', authenticateToken, (req, res) => {
  const { QualificationCode, QualificationName, UserID } = req.body;

  const query = `
      INSERT INTO QualificationMaster (QualificationCode, Qualification, Userid)
      VALUES ('${QualificationCode}', N'${QualificationName}',  N'${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Qualification created successfully' });
    }
  });
});

// PUT update an existing Qual
app.put('/api/qual/:qualificationCode', authenticateToken, (req, res) => {
  const { qualificationCode } = req.params;

  const { qualificationName, UserID } = req.body;

  const query = `
      UPDATE QualificationMaster
      SET Qualification=N'${qualificationName}', Userid=N'${UserID}'
      WHERE QualificationCode=${qualificationCode};
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Qualification updated successfully',
          QualificationCode: qualificationCode,
          qualificationName,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a Qual
app.delete('/api/qual/:QualificationCode', authenticateToken, async (req, res) => {
  const { QualificationCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM QualificationMaster WHERE QualificationCode='${QualificationCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Qualification deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/qual/:QualificationCode', authenticateToken, (req, res) => {
//   const { QualificationCode } = req.params;
//   const query = `DELETE FROM QualificationMaster WHERE QualificationCode='${QualificationCode}'`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Qualification deleted successfully' });
//     }
//   });
// }); 

// For Gang Master------------------------------------------------------------------------------------

// GET all gang
app.get('/api/gang', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM GangMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new Gang
app.post('/api/gang', authenticateToken, (req, res) => {
  const { GangCode, GangName, GangRemark, UserID } = req.body;

  const query = `
      INSERT INTO GangMaster (GangCode, GangName, GangRemark1 ,Userid)
      VALUES ('${GangCode}', N'${GangName}', N'${GangRemark}' ,N'${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Gang created successfully' });
    }
  });
});

// PUT update an existing Gang
app.put('/api/gang/:GangCode', authenticateToken, (req, res) => {
  const { GangCode } = req.params;
  const { GangName, GangRemark, UserID } = req.body;

  const query = `
      UPDATE GangMaster
      SET GangName=N'${GangName}', GangRemark1=N'${GangRemark}' ,Userid=N'${UserID}'
      WHERE GangCode='${GangCode}';
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Gang updated successfully',
          GangCode: GangCode,
          GangName,
          GangRemark,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a Gang
app.delete('/api/gang/:GangCode', authenticateToken, async (req, res) => {
  const { GangCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM GangMaster WHERE GangCode=${GangCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Gang deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/gang/:GangCode', authenticateToken, (req, res) => {
//   const { GangCode } = req.params;
//   const query = `DELETE FROM GangMaster WHERE GangCode=${GangCode}`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Gang deleted successfully' });
//     }
//   });
// }); 

// For EmpType Master------------------------------------------------------------------------------------

// GET all EmpType
app.get('/api/emptype', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM EmpTypeMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new EmpType
app.post('/api/emptype', authenticateToken, (req, res) => {
  const { EmpTypeCode, EmpType, UserID } = req.body;

  const query = `
      INSERT INTO EmpTypeMaster (EmpTypeCode, EmpType ,UserID)
      VALUES ('${EmpTypeCode}', N'${EmpType}','${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'EmpType created successfully' });
    }
  });
});

// PUT update an existing EMpType
app.put('/api/emptype/:EmpTypeCode', authenticateToken, (req, res) => {
  const { EmpTypeCode } = req.params;
  const { EmpType, UserID } = req.body;

  const query = `
      UPDATE EmpTypeMaster
      SET EmpType=N'${EmpType}' UserID='${UserID}' WHERE EmpTypeCode='${EmpTypeCode}';
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'EmpType updated successfully',
          EmpTypeCode: EmpTypeCode,
          EmpType,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a EmpType
app.delete('/api/emptype/:EmpTypeCode', authenticateToken, async (req, res) => {
  const { EmpTypeCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM EmpTypeMaster WHERE EmpTypeCode=${EmpTypeCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'EmpType deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/emptype/:EmpTypeCode', authenticateToken, (req, res) => {
//   const { EmpTypeCode } = req.params;
//   const query = `DELETE FROM EmpTypeMaster WHERE EmpTypeCode=${EmpTypeCode}`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'EmpType deleted successfully' });
//     }
//   });
// });

//Trai-Balance report ------------------------------------------------------------------------------------
app.get('/api/trialbalance', authenticateToken, (req, res) => {
  const { CompCode, DeptCode, YearCode, endDate } = req.query;
  const query = `
      DECLARE @return_value int;
  
      EXEC @return_value = [dbo].[ProcTrialBalance]
          @CompCode = @CompCode,
          @DeptCode = @DeptCode,
          @YearCode = @YearCode,
          @Trdate = @Trdate;
  
      SELECT 'Return Value' = @return_value;`;

  const request = new sql.Request();
  request.input('CompCode', sql.Int, CompCode);
  request.input('DeptCode', sql.Int, DeptCode);
  request.input('YearCode', sql.Int, YearCode);
  request.input('Trdate', sql.NVarChar, endDate);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/stockStatement', authenticateToken, (req, res) => {
  const { CompCode, DeptCode, YearCode, endDate, itemCode } = req.query;
  const query = `
      DECLARE @return_value int;
  
      EXEC @return_value = [dbo].[ProcItemBalance]
          @CompCode = @CompCode,
          @DeptCode = @DeptCode,
          @YearCode = @YearCode,
          @ItCode =  @ItCode,
          @Trdate = @Trdate;
  
      SELECT 'Return Value' = @return_value;`;

  const request = new sql.Request();
  request.input('CompCode', sql.Int, CompCode);
  request.input('DeptCode', sql.Int, DeptCode);
  request.input('YearCode', sql.Int, YearCode);
  request.input('ItCode', sql.Int, itemCode);
  request.input('Trdate', sql.NVarChar, endDate);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/stockLedger', authenticateToken, (req, res) => {
  const { CompCode, DeptCode, YearCode, endDate } = req.query;
  const query = `
      DECLARE @return_value int;
  
      EXEC @return_value = [dbo].[ProcItemLedger]
          @CompCode = @CompCode,
          @DeptCode = @DeptCode,
          @YearCode = @YearCode,
          @Trdate = @Trdate;
  
      SELECT 'Return Value' = @return_value;`;

  const request = new sql.Request();
  request.input('CompCode', sql.Int, CompCode);
  request.input('DeptCode', sql.Int, DeptCode);
  request.input('YearCode', sql.Int, YearCode);
  request.input('Trdate', sql.NVarChar, endDate);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

//for start and endDate
//   app.get('/api/trialbalance', authenticateToken, (req, res) => {
//     const { CompCode, DeptCode, YearCode, startDate, endDate } = req.query;
//     const query = `
//       DECLARE @return_value int;

//       EXEC @return_value = [dbo].[ProcTrialBalance]
//           @CompCode = @CompCode,
//           @DeptCode = @DeptCode,
//           @YearCode = @YearCode,
//           @StartDate = @StartDate,
//           @EndDate = @EndDate;

//       SELECT 'Return Value' = @return_value;`;

//     const pool = new sql.ConnectionPool(/*Your SQL Server Configuration*/);
//     const poolConnect = pool.connect();
//     poolConnect.then(() => {
//         const request = new sql.Request(pool);
//         request.input('CompCode', sql.Int, CompCode);
//         request.input('DeptCode', sql.Int, DeptCode);
//         request.input('YearCode', sql.Int, YearCode);
//         request.input('StartDate', sql.NVarChar, startDate);
//         request.input('EndDate', sql.NVarChar, endDate);

//         request.query(query, (err, result) => {
//             if (err) {
//                 console.log('Error:', err);
//                 res.status(500).json({ error: 'Internal server error' });
//             } else {
//                 res.json(result.recordset);
//             }
//             pool.close();
//         });
//     }).catch(err => {
//         console.log('Database connection failed:', err);
//         res.status(500).json({ error: 'Database connection failed' });
//     });
// });


app.get('/api/DayBook', authenticateToken, (req, res) => {
  const { ledgerCode, startDate, endDate } = req.query;
  const query = `SELECT * FROM viewTranentries WHERE Accode != @Accode AND Trdate >= @StartDate AND Trdate <= @EndDate;`;

  const request = new sql.Request();
  request.input('Accode', sql.Int, ledgerCode);
  request.input('StartDate', sql.NVarChar, startDate);
  request.input('EndDate', sql.NVarChar, endDate);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});



// Define the API endpoint to initialize TmpDayBook1 and TmpDayBook2
app.get('/api/initDayBook', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  const query = `
  Truncate Table TmpDayBook1;
  insert into TmpDayBook1 (SrNo, Trdate, Flag, LAcCode, LAcHead, LAmt, LSubAcCode, entryno, lcashamt, ltramt, LsubAmt, REntryno)
  select 0, a.TrDate, a.Flag, a.AcCode, b.achead, sum(a.CrAmt) as CrAmt, 0, 0, 0, 0, 0, 0
  from TranEntry as a
  join LedgerMaster as b on a.AcCode = b.AcCode
  join SubLedgerMaster as c on a.SubAcCode = c.SubAcCode and a.SubLedgerGroupCode = c.SubLedgerGroupCode
  where a.AcCode <> 1 and CrAmt > 0 and a.TrDate >= @StartDate and a.TrDate <= @EndDate and a.DeptCode = 1
  group by a.Trdate, a.AcCode, b.AcHead, a.Flag;

  insert into TmpDayBook1 (SrNo, Trdate, Flag, LsubAcCode, LsubAcHead, LCashAmt, LTRAmt, LAcCode, LsubAmt, LAmt, LNarration1, Entryno, RFlag, REntryno)
  select 0, a.TrDate, a.Flag, a.SubAcCode,c.subachead, a.CrAmt, 0, a.AcCode, 0, 0, a.Narration1, a.entryno, '', 0
  from TranEntry as a
  join LedgerMaster as b on a.AcCode = b.AcCode
  join SubLedgerMaster as c on a.SubAcCode = c.SubAcCode and a.SubLedgerGroupCode = c.SubLedgerGroupCode
  where a.AcCode <> 1 and CrAmt > 0 and a.CashOrTr = 0 and a.TrDate >= @StartDate and a.TrDate <= @EndDate and a.DeptCode = 1
  order by a.Trdate, a.AcCode, b.AcHead, a.Flag;

  insert into TmpDayBook1 (SrNo, Trdate, Flag, LsubAcCode, LsubAcHead, LCashAmt, LTRAmt, LAcCode, LsubAmt, LAmt, LNarration1, Entryno, RFlag, REntryno)
  select 0, a.TrDate, a.Flag, a.SubAcCode, c.subachead, 0, a.CrAmt, a.AcCode, 0, 0, a.Narration1, a.entryno, '', 0
  from TranEntry as a
  join LedgerMaster as b on a.AcCode = b.AcCode
  join SubLedgerMaster as c on a.SubAcCode = c.SubAcCode and a.SubLedgerGroupCode = c.SubLedgerGroupCode
  where a.AcCode <> 1 and CrAmt > 0 and a.CashOrTr = 1 and a.TrDate >= @StartDate and a.TrDate <= @EndDate and a.DeptCode = 1
  order by a.Trdate, a.AcCode, b.AcHead, a.Flag;

  Truncate Table TmpDayBook2;
  insert into TmpDayBook2 (SrNo, Trdate, Flag, RAcCode, RAcHead, RAmt, RSubAcCode, entryno, rcashamt, rtramt, rsubamt, REntryno, RFlag)
  select 0, a.TrDate, a.Flag, a.AcCode, b.achead, sum(a.DrAmt) as DrAmt, 0, 0, 0, 0, 0, 0, ''
  from TranEntry as a
  join LedgerMaster as b on a.AcCode = b.AcCode
  join SubLedgerMaster as c on a.SubAcCode = c.SubAcCode and a.SubLedgerGroupCode = c.SubLedgerGroupCode
  where a.AcCode <> 1 and DrAmt > 0 and a.TrDate >= @StartDate and a.TrDate <= @EndDate and a.DeptCode = 1
  group by a.Trdate, a.AcCode, b.AcHead, a.Flag;

  insert into TmpDayBook2 (SrNo, Trdate, Flag, RsubAcCode, RsubAcHead, RCashAmt, RTRAmt, RAcCode, rsubamt, Ramt, RNarration1, REntryno, RFlag)
  select 0, a.TrDate, a.Flag, a.SubAcCode, c.subachead, a.DrAmt, 0, a.AcCode, 0, 0, a.Narration1, a.entryno, a.Flag
  from TranEntry as a
  join LedgerMaster as b on a.AcCode = b.AcCode
  join SubLedgerMaster as c on a.SubAcCode = c.SubAcCode and a.SubLedgerGroupCode = c.SubLedgerGroupCode
  where a.AcCode <> 1 and DrAmt > 0 and a.CashOrTr = 0 and a.TrDate >= @StartDate and a.TrDate <= @EndDate and a.DeptCode = 1
  order by a.Trdate, a.AcCode, b.AcHead, a.Flag;

  insert into TmpDayBook2 (SrNo, Trdate, Flag, RsubAcCode, RsubAcHead, RCashAmt, RTRAmt, RAcCode, rsubamt, Ramt, RNarration1, REntryno, RFlag)
  select 0, a.TrDate, a.Flag, a.SubAcCode, c.subachead, 0, a.DrAmt, a.AcCode, 0, 0, a.Narration1, a.entryno, a.Flag
  from TranEntry as a
  join LedgerMaster as b on a.AcCode = b.AcCode
  join SubLedgerMaster as c on a.SubAcCode = c.SubAcCode and a.SubLedgerGroupCode = c.SubLedgerGroupCode
  where a.AcCode <> 1 and DrAmt > 0 and a.CashOrTr = 1 and a.TrDate >= @StartDate and a.TrDate <= @EndDate and a.DeptCode = 1
  order by a.Trdate, a.AcCode, b.AcHead, a.Flag;
  `;

  const request = new sql.Request();
  request.input('StartDate', sql.NVarChar, startDate);
  request.input('EndDate', sql.NVarChar, endDate);

  request.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TmpDayBooks initialized' });
    }
  });
});


app.get('/api/openingBal', authenticateToken, (req, res) => {
  const { CompCode, DeptCode, YearCode, startDate } = req.query;

  const query = `
    DECLARE @return_value int;

      EXEC @return_value = [dbo].[ProcLedgerBalance]
          @CompCode = @CompCode,
          @DeptCode = @DeptCode,
          @YearCode = @YearCode,
          @Accode = 1,
          @Trdate = @Trdate;

      SELECT @return_value as ReturnValue;`;
  const request = new sql.Request();
  request.input('CompCode', sql.Int, CompCode);
  request.input('DeptCode', sql.Int, DeptCode);
  request.input('YearCode', sql.Int, YearCode);
  request.input('Trdate', sql.Date, startDate);
  request.query(query, (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Internal server error', details: err.message });
    } else {
      res.json(result.recordset);
    }
  });
});


app.get('/api/ClosingBal', authenticateToken, (req, res) => {
  const { CompCode, DeptCode, YearCode, endDate } = req.query;

  const query = `
      DECLARE @return_value int;

      EXEC @return_value = [dbo].[ProcLedgerBalance]
          @CompCode = @CompCode,
          @DeptCode = @DeptCode,
          @YearCode = @YearCode,
          @Accode = 1,
          @Trdate = @Trdate;
      SELECT @return_value as ReturnValue;`;

  const request = new sql.Request();
  request.input('CompCode', sql.Int, CompCode);
  request.input('DeptCode', sql.Int, DeptCode);
  request.input('YearCode', sql.Int, YearCode);
  request.input('Trdate', sql.Date, endDate); // Ensure date format matches SQL Server expectations
  // request.output('return_value', sql.Int);

  request.query(query, (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Internal server error', details: err.message });
    } else {
      res.json(result.recordset);

    }
  });
});



app.get('/api/DayBook1', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM TmpDayBook1 order by Trdate,LAcCode,LsubAcCode';

  const request = new sql.Request();
  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Define the API endpoint to fetch data from TmpDayBook2
app.get('/api/DayBook2', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM TmpDayBook2 order by Trdate,RAcCode,RsubAcCode';

  const request = new sql.Request();
  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/trialBalance1', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  const query = `
    SELECT Accode, achead, SUM(cramt) AS CrAmt, 0 AS DrAmt 
    FROM Viewtranentries 
    WHERE cramt > 0 AND trdate >= @startDate AND trdate <= @endDate AND deptcode = 1 AND compcode = 1 
    GROUP BY accode, achead
  `;

  const request = new sql.Request();
  request.input('startDate', sql.Date, startDate);
  request.input('endDate', sql.Date, endDate);
  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/trialBalance2', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;

  const query = `
    SELECT Accode, achead, 0 AS CrAmt, SUM(Dramt) AS DrAmt 
    FROM Viewtranentries 
    WHERE DrAmt > 0 AND trdate >= @startDate AND trdate <= @endDate AND deptcode = 1 AND compcode = 1 
    GROUP BY accode, achead
  `;

  const request = new sql.Request();
  request.input('startDate', sql.Date, startDate);
  request.input('endDate', sql.Date, endDate);
  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/initBalancesheet', authenticateToken, (req, res) => {
  const { startDate, endDate, CompCode, DeptCode, YearCode } = req.query;
  const query = `
  update TranLedgerMaster set topbal = 0,TCredit=0,TDebit=0,TCurBal=0 where compcode = ${CompCode} and deptcode = ${DeptCode}

  UPDATE tranledgermaster
  SET topbal = subquery.opbal,
      TCredit = subquery.CrAmt,
      TDebit = subquery.DrAmt,
      TCurBal = subquery.ClBal
  FROM (
      SELECT a.Accode,
            SUM(a.opbal) AS opbal,
            SUM(a.cramt) AS CrAmt,
            SUM(a.dramt) AS DrAmt,
            SUM(a.opbal) + SUM(a.cramt) - SUM(a.dramt) AS ClBal
      FROM Viewtranentries AS a
      WHERE a.trdate <= '${endDate}'
        AND a.deptcode = ${DeptCode}
        AND a.compcode = ${CompCode}
      GROUP BY a.Accode
  ) AS subquery
  WHERE tranledgermaster.Accode = subquery.Accode;


  update TranLedgerMaster set  TCurBal = TCurBal - TOpBal where accode in (select accode from LedgerMaster where AcGroupCode in 
  (select AcGroupCode from AcGroupMaster where AcGroupType <> 3));

  update TranLedgerMaster set topbal = (select sum(a.Topbal) as opbal from TranLedgerMaster as a where  A.deptcode = ${DeptCode} and A.compcode = ${CompCode} 
  and a.Accode in (select accode from ledgermaster where AcGroupCode in (select AcGroupCode from AcGroupMaster where AcGroupType = 1))) * -1
  where (TranLedgerMaster.accode =    164);

  update TranLedgerMaster set topbal = (select sum(a.Topbal) as opbal from TranLedgerMaster as a where  A.deptcode = ${DeptCode} and A.compcode = ${CompCode} 
  and a.Accode in (select accode from ledgermaster where AcCode <> 164 And AcGroupCode in (select AcGroupCode from AcGroupMaster where AcGroupType = 1)))
  where (TranLedgerMaster.accode =    165);

  update TranLedgerMaster set TCurBal = (select sum(a.TCurBal) as opbal from TranLedgerMaster as a where  A.deptcode = ${DeptCode} and A.compcode = ${CompCode}
  and a.Accode in (select accode from ledgermaster where AcGroupCode in (select AcGroupCode from AcGroupMaster where AcGroupType = 1))) * -1 
  where (TranLedgerMaster.accode =    164);

   update TranLedgerMaster set TCurBal = (select sum(a.TCurBal) as opbal from TranLedgerMaster as a where  A.deptcode = ${DeptCode} and A.compcode = ${CompCode}
  and a.Accode in (select accode from ledgermaster where AcCode <> 164 And AcGroupCode in (select AcGroupCode from AcGroupMaster where AcGroupType = 1))) * -1 
  where (TranLedgerMaster.accode =    165);

  update TranLedgerMaster set topbal = (select sum(a.Topbal) as opbal from TranLedgerMaster as a where  A.deptcode = ${DeptCode} and A.compcode = ${CompCode} 
  and a.Accode in (select accode from ledgermaster where AcGroupCode in (select AcGroupCode from AcGroupMaster where AcGroupType = 2))) * -1 
  where (TranLedgerMaster.accode =  33);

  update TranLedgerMaster set topbal = (select sum(a.Topbal) as opbal from TranLedgerMaster as a where  A.deptcode = ${DeptCode} and A.compcode = ${CompCode} 
  and a.Accode in (select accode from ledgermaster where AcCode <> 165 And AcGroupCode in (select AcGroupCode from AcGroupMaster where AcGroupType in (1,2)))) 
  where (TranLedgerMaster.accode =    166);

  update TranLedgerMaster set TCurBal = (select sum(a.TCurBal) as opbal from TranLedgerMaster as a where  A.deptcode = ${DeptCode} and A.compcode = ${CompCode} 
  and a.Accode in (select accode from ledgermaster where accode = 166 or AcGroupCode in (select AcGroupCode from AcGroupMaster where AcGroupType in (1,2)))) * -1  
  where (TranLedgerMaster.accode = 33);

    update TranLedgerMaster set TCurBal = (select sum(a.TCurBal) as opbal from TranLedgerMaster as a where  A.deptcode = ${DeptCode} and A.compcode = ${CompCode} 
  and a.Accode in (select accode from ledgermaster where AcCode <> 165 And AcGroupCode in (select AcGroupCode from AcGroupMaster where AcGroupType in (1,2))))
  where (TranLedgerMaster.accode =    166);
  `;

  const request = new sql.Request();
  request.input('StartDate', sql.NVarChar, startDate);
  request.input('EndDate', sql.NVarChar, endDate);

  request.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
      console.log('query:', query);
    } else {
      res.json({ message: 'TmpDayBooks initialized' });
      console.log('query:', query);
    }
  });
});

app.get('/api/Balancesheet1/:endDate/:flag', authenticateToken, (req, res) => {
  const { endDate, flag } = req.params;
  const { CompCode, DeptCode, YearCode } = req.query;

  const query = `
  select a.Accode,a.TOpBal as opbal,b.achead,a.TCredit as CrAmt,a.TDebit as DrAmt,a.TCurBal as ClBal,b.acgroupcode AS AcGroupCode,c.acgroupname as 
  AcGroupName,AcGroupType as AcgroupType,AcGroupPrintPosition as AcGroupPrintPosition from TranLedgerMaster as a, Ledgermaster as b, Acgroupmaster 
  as c  where  a.accode = b.accode and b.acgroupcode = c.acgroupcode and c.acgrouptype = ${flag} and A.deptcode = ${DeptCode} and A.compcode = ${CompCode} and c.yearcode = 1 
  order by c.AcGroupType,c.AcGroupPrintPosition,a.accode
  `;

  const request = new sql.Request();
  // request.input('startDate', sql.Date, startDate);
  request.input('endDate', sql.Date, endDate);
  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/Balancesheet2/:endDate/:flag', authenticateToken, (req, res) => {
  const { endDate, flag } = req.params;
  const { CompCode, DeptCode, YearCode } = req.query;


  const query = `
   select a.Accode,a.TOpBal as opbal,b.achead,a.TCredit as CrAmt,a.TDebit as DrAmt,a.TCurBal as ClBal,b.acgroupcode AS AcGroupCode,c.acgroupname 
   as AcGroupName,AcGroupType as AcgroupType,AcGroupPrintPosition as AcGroupPrintPosition from TranLedgerMaster as a, Ledgermaster as b, 
   Acgroupmaster as c  where  a.accode = b.accode and b.acgroupcode = c.acgroupcode  and c.acgrouptype = ${flag} and  A.deptcode = ${DeptCode} and A.compcode = ${CompCode} 
   and c.yearcode = 2 order by c.AcGroupType,c.AcGroupPrintPosition,a.accode
  `;

  const request = new sql.Request();
  // request.input('startDate', sql.Date, startDate);
  request.input('endDate', sql.Date, endDate);
  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// app.get('/api/Balancesheet1', authenticateToken, (req, res) => {
//   const { startDate, endDate, flag } = req.query;

//   const query = `
//     select a.Accode,sum(a.opbal) as opbal,a.achead,sum(a.cramt) as CrAmt,sum(a.dramt) as DrAmt,iif(max(c.acgrouptype)=3,sum(a.opbal),0) +sum(a.cramt)-sum(a.dramt) as 
//     ClBal,MAX(b.acgroupcode) AS AcGroupCode,MAX(c.acgroupname) as AcGroupName,MAX(AcGroupType) as AcgroupType,MAX(AcGroupPrintPosition) as 
//     AcGroupPrintPosition from Viewtranentries as a, Ledgermaster as b, Acgroupmaster as c  where  a.accode = b.accode and 
//     b.acgroupcode = c.acgroupcode and  A.trdate <='${endDate}' and A.deptcode = 1 and A.compcode = 1 and A.deptcode = 1 and c.yearcode = 1 and c.acgrouptype = ${flag} group 
//     by a.accode,a.Achead   order by max(c.AcGroupType),max(c.AcGroupPrintPosition),a.accode
//   `;

//   const request = new sql.Request();
//   request.input('startDate', sql.Date, startDate);
//   request.input('endDate', sql.Date, endDate);
//   request.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json(result.recordset);
//     }
//   });
// });

// app.get('/api/Balancesheet2', authenticateToken, (req, res) => {
//   const { startDate, endDate, flag } = req.query;

//   const query = `
//    select a.Accode,sum(a.opbal) as opbal,a.achead,sum(a.cramt) as CrAmt,sum(a.dramt) as DrAmt,iif(max(c.acgrouptype)=3,sum(a.opbal),0) +sum(a.cramt)-sum(a.dramt) as 
//    ClBal,MAX(b.acgroupcode) AS AcGroupCode,MAX(c.acgroupname) as AcGroupName,MAX(AcGroupType) as AcgroupType,MAX(AcGroupPrintPosition) as 
//    AcGroupPrintPosition from Viewtranentries as a, Ledgermaster as b, Acgroupmaster as c  where  a.accode = b.accode and 
//    b.acgroupcode = c.acgroupcode and  A.trdate <='${endDate}'and A.deptcode = 1 and A.compcode = 1 and A.deptcode = 1 and c.yearcode = 0 and c.acgrouptype = ${flag} group 
//    by a.accode,a.Achead   order by max(c.AcGroupType),max(c.AcGroupPrintPosition),a.accode
//   `;

//   const request = new sql.Request();
//   request.input('startDate', sql.Date, startDate);
//   request.input('endDate', sql.Date, endDate);
//   request.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json(result.recordset);
//     }
//   });
// });


app.get('/api/ViewTranEntries', authenticateToken, (req, res) => {
  const { ledgerCode, startDate, endDate } = req.query;
  const query = `select * from viewTranentries where Accode = @Accode and  Trdate >= @StartDate AND Trdate <= @EndDate;`;

  const request = new sql.Request();
  request.input('Accode', sql.Int, ledgerCode);
  request.input('StartDate', sql.NVarChar, startDate);
  request.input('EndDate', sql.NVarChar, endDate);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/viewBillRegister', authenticateToken, (req, res) => {
  const { ledgerCode, startDate, endDate, flag } = req.query;
  const query = `select * from viewBillRegister where  Trdate >= @StartDate AND Trdate <= @EndDate AND Flag =@flag;`;

  const request = new sql.Request();
  request.input('Accode', sql.Int, ledgerCode);
  request.input('StartDate', sql.NVarChar, startDate);
  request.input('EndDate', sql.NVarChar, endDate);
  request.input('flag', sql.NVarChar, flag);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
      console.log('flag:', flag);
    }
  });
});

// For EmployeeMaster------------------------------------------------------------------------------------
app.get('/api/employee', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM EmployeeMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

//Aadhar Upload
app.post('/uploadAadhar', upload.single('image'), authenticateToken, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("AadharCard Name : ", image);
  return res.json({ Status: "Success", AadharCard: image });
});

//Pan Upload
app.post('/uploadPan', upload.single('image'), authenticateToken, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("Pan Name : ", image);
  return res.json({ Status: "Success", PanCard: image });
});

//RationCard Upload 
app.post('/uploadRC', upload.single('image'), authenticateToken, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("RationCard Name : ", image);
  return res.json({ Status: "Success", RationCard: image });
});

//License Upload 
app.post('/uploadLicense', upload.single('image'), authenticateToken, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("License Name : ", image);
  return res.json({ Status: "Success", License: image });
});

//BirthCertificate Upload 
app.post('/uploadBirth', upload.single('image'), authenticateToken, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("Birth Name : ", image);
  return res.json({ Status: "Success", Birth: image });
});

//PolicePatil Upload 
app.post('/uploadPolice', upload.single('image'), authenticateToken, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("PolicePatil Name : ", image);
  return res.json({ Status: "Success", PolicePatil: image });
});

//Agreement Upload 
app.post('/uploadAgreement', upload.single('image'), authenticateToken, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("Agreement Name : ", image);
  return res.json({ Status: "Success", Agreement: image });
});

app.post('/api/employee', authenticateToken, async (req, res) => {
  const {
    EmpCode,
    KYCCode,
    EmpName,
    EmpNameEng,
    AddressCurrent,
    AddressPermanant,
    City,
    Phone,
    MobileNo,
    Email,
    AadharNo,
    PanNo,
    RationCardNo,
    PFNo,
    PensionYears,
    BankAcNo,
    BankName,
    BankIFSC,
    Gender,
    MaritalStatus,
    DateOfEmployment,
    DateOfBirth,
    DateOfRetirement,
    RetireAge,
    EmpTypeCode,
    DesigCode,
    QualificationCode,
    CasteCode,
    CompCode,
    DeptCode,
    GangCode,
    StatusCode,
    MemberCode1,
    MemberCode2,
    MemberCode3,
    PhotoPath,
    SignPath,
    AadharPath,
    PanPath,
    RationCardPath,
    LicensePath,
    BirthCertificatePath,
    PolicePatilPath,
    AgreementPath,
    Doc1Path,
    Doc2Path,
    Doc3Path,
    FamilyMembers,
    Remark1,
    Remark2,
    Remark3,
    CHECKEDBY,
    USERID
  } = req.body;

  const query = `
    INSERT INTO EmployeeMaster (
      EmpCode,
      KYCCode,
      EmpName,
      EmpNameEng,
      AddressCurrent,
      AddressPermanant,
      City,
      Phone,
      MobileNo,
      Email,
      AadharNo,
      PanNo,
      RationCardNo,
      PFNo,
      PensionYears,
      BankAcNo,
      BankName,
      BankIFSC,
      Gender,
      MaritalStatus,
      DateOfEmployment,
      DateOfBirth,
      DateOfRetirement,
      Age,
      EmpTypeCode,
      DesgCode,
      QualificationCode,
      CasteCode,
      CompCode,
      DeptCode,
      GangCode,
      StatusCode,
      MemberCode1,
      MemberCode2,
      MemberCode3,
      PhotoPath,
      SignPath,
      AadharPath,
      PanPath,
      RationCardPath,
      LicensePath,
      BirthCertificatePath,
      PolicePatilPath,
      AgreementPath,
      Doc1Path,
      Doc2Path,
      Doc3Path,
      FamilyMembers,
      Remark1,
      Remark2,
      Remark3,
      CHECKEDBY,
      USERID
    )
    VALUES (
      '${EmpCode}',
      '${KYCCode}',
      N'${EmpName}',
      N'${EmpNameEng}',
      N'${AddressCurrent}',
      N'${AddressPermanant}',
      N'${City}',
      '${Phone}',
      '${MobileNo}',
      '${Email}',
      '${AadharNo}',
      '${PanNo}',
      '${RationCardNo}',
      '${PFNo}',
      '${PensionYears}',
      '${BankAcNo}',
      '${BankName}',
      '${BankIFSC}',
      '${Gender}',
      '${MaritalStatus}',
      '${DateOfEmployment}',
      '${DateOfBirth}',
      '${DateOfRetirement}',
      '${RetireAge}',
      '${EmpTypeCode}',
      '${DesigCode}',
      '${QualificationCode}',
      '${CasteCode}',
      '${CompCode}',
      '${DeptCode}',
      '${GangCode}',
      '${StatusCode}',
      '${MemberCode1}',
      '${MemberCode2}',
      '${MemberCode3}',
      '${PhotoPath}',
      '${SignPath}',
      '${AadharPath}',
      '${PanPath}',
      '${RationCardPath}',
      '${LicensePath}',
      '${BirthCertificatePath}',
      '${PolicePatilPath}',
      '${AgreementPath}',
      '${Doc1Path}',
      '${Doc2Path}',
      '${Doc3Path}',
      '${FamilyMembers}',
      '${Remark1}',
      '${Remark2}',
      '${Remark3}',
      '${CHECKEDBY}',
      '${USERID}'
    );
  `;

  try {
    await sql.query(query);
    res.json({ message: 'Success' });
  } catch (error) {
    console.log('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/employee/:EmpCode', authenticateToken, async (req, res) => {
  const { EmpCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM EmployeeMaster WHERE EmpCode='${EmpCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Employee deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.put('/api/employee/:EmpCode', authenticateToken, async (req, res) => {
  const { EmpCode } = req.params;
  const {
    KYCCode,
    EmpName,
    EmpNameEng,
    AddressCurrent,
    AddressPermanant,
    City,
    Phone,
    MobileNo,
    Email,
    AadharNo,
    PanNo,
    RationCardNo,
    PFNo,
    PensionYears,
    BankAcNo,
    BankName,
    BankIFSC,
    Gender,
    MaritalStatus,
    DateOfEmployment,
    DateOfBirth,
    DateOfRetirement,
    RetireAge,
    EmpTypeCode,
    DesgCode,
    QualificationCode,
    CasteCode,
    CompCode,
    DeptCode,
    GangCode,
    StatusCode,
    MemberCode1,
    MemberCode2,
    MemberCode3,
    PhotoPath,
    SignPath,
    AadharPath,
    PanPath,
    RationCardPath,
    LicensePath,
    BirthCertificatePath,
    PolicePatilPath,
    AgreementPath,
    Doc1Path,
    Doc2Path,
    Doc3Path,
    FamilyMembers,
    Remark1,
    Remark2,
    Remark3,
    CHECKEDBY,
    USERID
  } = req.body;

  const query = `
      UPDATE EmployeeMaster
      SET
        KYCCode = '${KYCCode}',
        EmpName = N'${EmpName}',
        EmpNameEng = N'${EmpNameEng}',
        AddressCurrent = N'${AddressCurrent}',
        AddressPermanant = N'${AddressPermanant}',
        City = N'${City}',
        Phone = '${Phone}',
        MobileNo = '${MobileNo}',
        Email = N'${Email}',
        AadharNo = '${AadharNo}',
        PanNo = '${PanNo}',
        RationCardNo = '${RationCardNo}',
        PFNo = '${PFNo}',
        PensionYears = '${PensionYears}',
        BankAcNo = '${BankAcNo}',
        BankName = N'${BankName}',
        BankIFSC = '${BankIFSC}',
        Gender = N'${Gender}',
        MaritalStatus = N'${MaritalStatus}',
        DateOfEmployment = '${DateOfEmployment}',
        DateOfBirth = '${DateOfBirth}',
        DateOfRetirement = '${DateOfRetirement}',
        Age = ${RetireAge},
        EmpTypeCode = ${EmpTypeCode},
        DesgCode = ${DesgCode},
        QualificationCode = ${QualificationCode},
        CasteCode = ${CasteCode},
        CompCode = ${CompCode},
        DeptCode = ${DeptCode},
        GangCode = ${GangCode},
        StatusCode = ${StatusCode},
        MemberCode1 = ${MemberCode1},
        MemberCode2 = ${MemberCode2}, 
        MemberCode3 = ${MemberCode3},
        PhotoPath = N'${PhotoPath}',
        SignPath = N'${SignPath}',
        AadharPath = N'${AadharPath}',
        PanPath = N'${PanPath}',
        RationCardPath = N'${RationCardPath}',
        LicensePath = N'${LicensePath}',
        BirthCertificatePath = N'${BirthCertificatePath}',
        PolicePatilPath = N'${PolicePatilPath}',
        AgreementPath = N'${AgreementPath}',
        Doc1Path = N'${Doc1Path}',
        Doc2Path = N'${Doc2Path}',
        Doc3Path = N'${Doc3Path}',
        FamilyMembers = '${FamilyMembers}',
        Remark1 = N'${Remark1}',
        Remark2 = N'${Remark2}',
        Remark3 = N'${Remark3}',
        CHECKEDBY = N'${CHECKEDBY}',
        USERID = '${USERID}'
      WHERE
        EmpCode = ${EmpCode};
    `;

  try {
    await sql.query(query);
    res.json({ message: 'Employee updated successfully' });
    console.log('query:', query);

  } catch (error) {
    console.log('Error:', error);
    console.log('query:', query);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For EmpFamilyMemberMaster------------------------------------------------------------------------------------
// GET all EmpFamilyMemberMaster
app.get('/api/empFamily/:EmpCode', authenticateToken, (req, res) => {
  const { EmpCode } = req.params;
  const query = `SELECT * FROM EmpFamilyMemberMaster WHERE EmpCode = ${EmpCode}`;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/uploadFamilyPhoto', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("Image Name : ", image);
  return res.json({ Status: "Success", FamilyMemberPhoto: image });
});

app.post('/api/uploadFamilyDoc1', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("Image Name : ", image);
  return res.json({ Status: "Success", FamilyMemberDoc1: image });
});

app.post('/api/uploadFamilyDoc2', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("Image Name : ", image);
  return res.json({ Status: "Success", FamilyMemberDoc2: image });
});

app.post('/api/uploadFamilyDoc3', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("Image Name : ", image);
  return res.json({ Status: "Success", FamilyMemberDoc3: image });
});

app.post('/api/uploadFamilyDoc4', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("Image Name : ", image);
  return res.json({ Status: "Success", FamilyMemberDoc4: image });
});

app.post('/api/uploadFamilyDoc5', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const image = req.file.filename;
  console.log("Image Name : ", image);
  return res.json({ Status: "Success", FamilyMemberDoc5: image });
});


app.get('/api/getFamilyPhoto/:EmpCode', authenticateToken, (req, res) => {
  const empCode = req.params.EmpCode;

  const query = `SELECT FamilyMemberPhoto FROM EmpFamilyMemberMaster WHERE EmpCode = '${empCode}'`;

  sql.query(query, (err, result) => {
    if (err) {
      console.error('Error fetching image:', err);
      return res.status(500).json({ Message: 'Error fetching image' });
    }

    if (result.recordset.length === 0) {
      return res.status(404).json({ Message: 'Image not found for the given EmpCode' });
    }

    const imagePath = path.join('D:\\Image', result.recordset[0].FamilyMemberPhoto); // Corrected path
    res.sendFile(imagePath);
  });
});

// Add Emp Family Member
app.post('/api/empFamily', authenticateToken, (req, res) => {
  const {
    EmpCode,
    FamilyMemberNo,
    FamilyMemberName,
    FamilyMemberDOB,
    FamilyMemberAge,
    FamilyMemberRelation,
    FamilyMemberPhoto,
    FamilyMemberDoc1,
    FamilyMemberDoc2,
    FamilyMemberDoc3,
    FamilyMemberDoc4,
    FamilyMemberDoc5,
    Remark,
    UserID
  } = req.body;

  const query = `
    INSERT INTO EmpFamilyMemberMaster (
        EmpCode, 
        FamilyMemberNo,
        FamilyMemberName,
        FamilyMemberDOB,
        FamilyMemberAge,
        FamilyMemberRelation,
        FamilyMemberPhoto,
        FamilyMemberDoc1,
        FamilyMemberDoc2,
        FamilyMemberDoc3,
        FamilyMemberDoc4,
        FamilyMemberDoc5,
        Remark1,
        UserID
      )
      VALUES (
        ${EmpCode},
        ${FamilyMemberNo},
        N'${FamilyMemberName}',
        '${FamilyMemberDOB}',
        ${FamilyMemberAge},
        N'${FamilyMemberRelation}',
        '${FamilyMemberPhoto}',
        '${FamilyMemberDoc1}',
        '${FamilyMemberDoc2}',
        '${FamilyMemberDoc3}',
        '${FamilyMemberDoc4}',
        '${FamilyMemberDoc5}',
        N'${Remark}',
        '${UserID}'
        ) 
    `;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: ' EmpFamilyMember created successfully' });
    }
  });
});

app.put('/api/empFamily/:EmpCode', authenticateToken, (req, res) => {
  const { EmpCode } = req.params;
  const {
    FamilyMemberNo,
    FamilyMemberName,
    FamilyMemberDOB,
    FamilyMemberAge,
    FamilyMemberRelation,
    FamilyMemberPhoto,
    FamilyMemberDoc1,
    FamilyMemberDoc2,
    FamilyMemberDoc3,
    FamilyMemberDoc4,
    FamilyMemberDoc5,
    Remark
  } = req.body;

  const query = `
      UPDATE EmpFamilyMemberMaster
      SET
        FamilyMemberName = N'${FamilyMemberName}',
        FamilyMemberDOB = '${FamilyMemberDOB}',
        FamilyMemberAge = ${FamilyMemberAge},
        FamilyMemberRelation = N'${FamilyMemberRelation}',
        FamilyMemberPhoto = '${FamilyMemberPhoto}',
        FamilyMemberDoc1 = '${FamilyMemberDoc1}',
        FamilyMemberDoc2 = '${FamilyMemberDoc2}',
        FamilyMemberDoc3 = '${FamilyMemberDoc3}',
        FamilyMemberDoc4 = '${FamilyMemberDoc4}',
        FamilyMemberDoc5 = '${FamilyMemberDoc5}',
        Remark1 = N'${Remark}'
      WHERE EmpCode = ${EmpCode} AND FamilyMemberNo = ${FamilyMemberNo};
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'EmpFamilyMember updated successfully' });
      console.log('query:', query);
    }
  });
});

app.delete('/api/empFamily/:EmpCode/:FamilyMemberNo', authenticateToken, async (req, res) => {
  const { EmpCode, FamilyMemberNo } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `
              DELETE FROM EmpFamilyMemberMaster
              WHERE EmpCode = ${EmpCode} AND FamilyMemberNo = ${FamilyMemberNo};
            `;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'EmpFamilyMember deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// app.delete('/api/empFamily/:EmpCode/:FamilyMemberNo', authenticateToken, (req, res) => {
//   const { EmpCode, FamilyMemberNo } = req.params;
//   const query = `
//     DELETE FROM EmpFamilyMemberMaster
//     WHERE EmpCode = ${EmpCode} AND FamilyMemberNo = ${FamilyMemberNo};
//   `;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'EmpFamilyMember deleted successfully' });
//     }
//   });
// });


// For StatusMaster------------------------------------------------------------------------------------
// GET all Status
app.get('/api/status', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM StatusMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new Status
app.post('/api/status', authenticateToken, (req, res) => {
  const { StatusCode, StatusDesc, UserID } = req.body;
  const query = `
      INSERT INTO StatusMaster (StatusCode, StatusDesc, UserID)
      VALUES ('${StatusCode}', N'${StatusDesc}',  N'${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Status created successfully' });
    }
  });
});

// PUT update an existing Status
app.put('/api/status/:StatusCode', authenticateToken, (req, res) => {
  const { StatusCode } = req.params;
  const { StatusDesc, UserID } = req.body;
  const query = `
      UPDATE StatusMaster
      SET StatusDesc=N'${StatusDesc}', UserID=N'${UserID}'
      WHERE StatusCode='${StatusCode}';
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Status updated successfully',
          StatusCode: StatusCode,
          StatusDesc,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a Status
app.delete('/api/status/:StatusCode', authenticateToken, async (req, res) => {
  const { StatusCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM StatusMaster WHERE StatusCode='${StatusCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Status deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/status/:StatusCode', authenticateToken, (req, res) => {
//   const { StatusCode } = req.params;
//   const query = `DELETE FROM StatusMaster WHERE StatusCode='${StatusCode}'`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Status deleted successfully' });
//     }
//   });
// }); 

// for Vehiclemaster 
// Get all Vehicle master
app.get('/api/vehicle', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM VehicleMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new Vehiclemaster
app.post('/api/vehicle', authenticateToken, (req, res) => {
  const {
    VehicleCode,
    VehicleNo,
    CategoryCode,
    OwnerName,
    ModelYear,
    HYPDetails,
    RegNo,
    ChassisNo,
    EngineNo,
    DateOfPurchase,
    PurchaseDetails,
    InsuranceDetails,
    InsuranceExpiryDate,
    TaxDetails,
    TaxExpiryDate,
    TYRESIZE,
    TANKSIZE,
    OtherDetails,
    AvgKM,
    CapacityWeight,
    DeptCode,
    TransporterCode,
    CapacityCrate,
    RatePerKm,
    Status,
  } = req.body;
  const query = `
    INSERT INTO VehicleMaster (
      VehicleCode,
      VehicleNo,
      CategoryCode,
      OwnerName,
      ModelYear,
      HYPDetails,
      RegNo,
      ChassisNo,
      EngineNo,
      DateOfPurchase,
      PurchaseDetails,
      InsuranceDetails,
      InsuranceExpiryDate,
      TaxDetails,
      TaxExpiryDate,
      TYRESIZE,
      TANKSIZE,
      OtherDetails,
      AvgKM,
      CapacityWeight,
      DeptCode,
      TransporterCode,
      CapacityCrate,
      RatePerKm,
      Status
    )
    VALUES (
      '${VehicleCode}',
      N'${VehicleNo}',
      '${CategoryCode}',
      N'${OwnerName}',
      N'${ModelYear}',
      N'${HYPDetails}',
      N'${RegNo}',
      N'${ChassisNo}',
      N'${EngineNo}',
      '${DateOfPurchase}',
      N'${PurchaseDetails}',
      N'${InsuranceDetails}',
      '${InsuranceExpiryDate}',
      N'${TaxDetails}',
      '${TaxExpiryDate}',
      N'${TYRESIZE}',
      N'${TANKSIZE}',
      N'${OtherDetails}',
      '${AvgKM}',
      '${CapacityWeight}',
      '${DeptCode}',
      '${TransporterCode}',
      '${CapacityCrate}',
      '${RatePerKm}',
      '${Status}'
    )
  `;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Vehicle created successfully' });
    }
  });
});

// Update a state by VehicleCode
app.put('/api/vehicle/:VehicleCode', authenticateToken, (req, res) => {
  const { VehicleCode } = req.params;
  const {
    VehicleNo,
    CategoryCode,
    OwnerName,
    ModelYear,
    HYPDetails,
    RegNo,
    ChassisNo,
    EngineNo,
    DateOfPurchase,
    PurchaseDetails,
    InsuranceDetails,
    InsuranceExpiryDate,
    TaxDetails,
    TaxExpiryDate,
    TYRESIZE,
    TANKSIZE,
    OtherDetails,
    AvgKM,
    CapacityWeight,
    DeptCode,
    TransporterCode,
    CapacityCrate,
    RatePerKm,
    Status,
  } = req.body;
  const query = `
    UPDATE VehicleMaster 
    SET 
      VehicleNo = '${VehicleNo}',
      CategoryCode = '${CategoryCode}',
      OwnerName = '${OwnerName}',
      ModelYear = '${ModelYear}',
      HYPDetails = '${HYPDetails}',
      RegNo = '${RegNo}',
      ChassisNo = '${ChassisNo}',
      EngineNo = '${EngineNo}',
      DateOfPurchase = '${DateOfPurchase}',
      PurchaseDetails = '${PurchaseDetails}',
      InsuranceDetails = '${InsuranceDetails}',
      InsuranceExpiryDate = '${InsuranceExpiryDate}',
      TaxDetails = '${TaxDetails}',
      TaxExpiryDate = '${TaxExpiryDate}',
      TYRESIZE = '${TYRESIZE}',
      TANKSIZE = '${TANKSIZE}',
      OtherDetails = '${OtherDetails}',
      AvgKM = '${AvgKM}',
      CapacityWeight = '${CapacityWeight}',
      DeptCode = '${DeptCode}',
      TransporterCode = '${TransporterCode}',
      CapacityCrate = '${CapacityCrate}',
      RatePerKm = '${RatePerKm}',
      Status = '${Status}'
    WHERE VehicleCode = '${VehicleCode}';
  `;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'VehicleMaster updated successfully',
          VehicleCode: VehicleCode,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a state by Vehicle
app.delete('/api/vehicle/:VehicleCode', authenticateToken, async (req, res) => {
  const { VehicleCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM VehicleMaster WHERE VehicleCode=${VehicleCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Vehicle deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/vehicle/:VehicleCode', authenticateToken, (req, res) => {
//   const { VehicleCode } = req.params;
//   const query = `DELETE FROM VehicleMaster WHERE VehicleCode=${VehicleCode}`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Vehicle deleted successfully' });
//     }
//   });
// });



// for settingmaster 
// Get all settingmaster
app.get('/api/setting', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM SettingsMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new settingmaster
app.post('/api/setting', authenticateToken, (req, res) => {
  const {
    SettingCode,
    SettingDesc1,
    SettingValue1,
    SettingDesc2,
    SettingValue2,
    SettingDesc3,
    SettingValue3,
    UserID,
  } = req.body;
  const query = `
    INSERT INTO SettingsMaster ( 
    SettingCode, SettingDesc1, SettingValue1, SettingDesc2, 
    SettingValue2, SettingDesc3, SettingValue3, UserID )
    VALUES (
    ${SettingCode}, N'${SettingDesc1}', N'${SettingValue1}', N'${SettingDesc2}',
    N'${SettingValue2}',N'${SettingDesc3}',N'${SettingValue3}', '${UserID}' );
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Setting created successfully' });
    }
  });
});

// Update a state by SettingCode
app.put('/api/setting/:SettingCode', authenticateToken, (req, res) => {
  const { SettingCode } = req.params;
  const {
    SettingDesc1,
    SettingValue1,
    SettingDesc2,
    SettingValue2,
    SettingDesc3,
    SettingValue3,
    UserID,
  } = req.body;
  const query = `
  UPDATE SettingsMaster SET 
    SettingDesc1 = N'${SettingDesc1}', 
    SettingValue1 = N'${SettingValue1}', 
    SettingDesc2 = N'${SettingDesc2}', 
    SettingValue2 = N'${SettingValue2}', 
    SettingDesc3 = N'${SettingDesc3}', 
    SettingValue3 = N'${SettingValue3}', 
    UserID = '${UserID}'
  WHERE SettingCode = ${SettingCode};
`;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'SettingMaster updated successfully',
          SettingCode: SettingCode,
          SettingDesc1,
          SettingValue1,
          SettingDesc2,
          SettingValue2,
          SettingDesc3,
          SettingValue3,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a state by SettingCode
app.delete('/api/setting/:SettingCode', authenticateToken, async (req, res) => {
  const { SettingCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM SettingsMaster WHERE SettingCode=${SettingCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Setting deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/setting/:SettingCode', authenticateToken, (req, res) => {
//   const { SettingCode } = req.params;
//   const query = `DELETE FROM SettingsMaster WHERE SettingCode=${SettingCode}`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Setting deleted successfully' });
//     }
//   });
// });


// for Productmaster 
// Get all Productmaster
app.get('/api/product', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM ProductMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new Productmaster
app.post('/api/product', authenticateToken, (req, res) => {
  const {
    ProductCode,
    ProductName,
    ProductNameEng,
    Remark1,
    Remark2,
    UserID,
  } = req.body;
  const query = `
    INSERT INTO ProductMaster (ProductCode, ProductName, ProductNameEng, Remark1, Remark2, UserID)
    VALUES (${ProductCode}, N'${ProductName}', N'${ProductNameEng}', N'${Remark1}',N'${Remark2}', '${UserID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Product created successfully' });
    }
  });
});

// Update a state by ProductMaster
app.put('/api/product/:ProductCode', authenticateToken, (req, res) => {
  const { ProductCode } = req.params;
  const {
    ProductName,
    ProductNameEng,
    Remark1,
    Remark2,
    UserID,
  } = req.body;
  const query = `
  UPDATE ProductMaster 
  SET 
    ProductName = N'${ProductName}', 
    ProductNameEng = N'${ProductNameEng}', 
    Remark1 = N'${Remark1}', 
    Remark2 = N'${Remark2}', 
    UserID = '${UserID}'
  WHERE ProductCode = ${ProductCode};
`;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Product updated successfully',
          ProductCode: ProductCode,
          ProductName,
          ProductNameEng,
          Remark1,
          Remark2,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a state by ProductMaster
app.delete('/api/product/:ProductCode', authenticateToken, async (req, res) => {
  const { ProductCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM ProductMaster WHERE ProductCode='${ProductCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Product deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/product/:ProductCode', authenticateToken, (req, res) => {
//   const { ProductCode } = req.params;
//   const query = `DELETE FROM ProductMaster WHERE ProductCode = ${ProductCode}`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Product deleted successfully' });
//     }
//   });
// });



// for HamaliTypemaster 
// Get all HamaliTypemaster
app.get('/api/hamaliType', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM HamaliTypeMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Create a new HamaliType
app.post('/api/hamaliType', authenticateToken, (req, res) => {
  const {
    HamaliTypeCode,
    HamaliType,
    HamaliTypeEng,
    UserID,
  } = req.body;
  const query = `
    INSERT INTO HamaliTypeMaster (HamaliTypeCode, HamaliType, HamaliTypeEng, UserID)
    VALUES (${HamaliTypeCode}, N'${HamaliType}', N'${HamaliTypeEng}', '${UserID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'HamaliType created successfully' });
    }
  });
});

// Update a state by HamaliType
app.put('/api/hamaliType/:HamaliTypeCode', authenticateToken, (req, res) => {
  const { HamaliTypeCode } = req.params;
  const {
    HamaliType,
    HamaliTypeEng,
    UserID,
  } = req.body;
  const query = `
  UPDATE HamaliTypeMaster 
  SET 
    HamaliType = N'${HamaliType}', 
    HamaliTypeEng = N'${HamaliTypeEng}', 
    UserID = '${UserID}'
  WHERE 
    HamaliTypeCode = ${HamaliTypeCode};
`;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'HamaliType updated successfully',
          HamaliTypeCode: HamaliTypeCode,
          HamaliType,
          HamaliTypeEng,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// Delete a state by HamaliType
app.delete('/api/hamaliType/:HamaliTypeCode', authenticateToken, async (req, res) => {
  const { HamaliTypeCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM HamaliTypeMaster WHERE HamaliTypeCode=${HamaliTypeCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'HamaliType deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/hamaliType/:HamaliTypeCode', authenticateToken, (req, res) => {
//   const { HamaliTypeCode } = req.params;
//   const query = `DELETE FROM HamaliTypeMaster WHERE HamaliTypeCode=${HamaliTypeCode}`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'HamaliType deleted successfully' });
//     }
//   });
// });

// Get all Bankmaster
app.get('/api/bankmaster', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM BankMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/PostBankMaster', authenticateToken, (req, res) => {
  const {
    bankCode,
    bankName,
    bankBranch,
    bankIFSC
  } = req.body;
  const query = `
    INSERT INTO BankMaster (  BankCode, BankName, BankBranch, BankIFSC)
    VALUES (${bankCode}, N'${bankName}', N'${bankBranch}', '${bankIFSC}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'HamaliType created successfully' });
    }
  });
});

app.put('/api/PutBankMaster/:bankCode', authenticateToken, (req, res) => {
  const bankCode = req.params.bankCode;
  const { bankName, bankBranch, bankIFSC } = req.body;

  const query = `
    UPDATE BankMaster 
    SET 
      BankName = N'${bankName}', 
      BankBranch = N'${bankBranch}', 
      BankIFSC = '${bankIFSC}'
    WHERE BankCode = ${bankCode};
  `;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({ message: `Bank record with bankCode ${bankCode} updated successfully` });
      } else {
        res.status(404).json({ error: `Bank record with bankCode ${bankCode} not found` });
      }
    }
  });
});

app.delete('/api/DeleteBankMaster/:bankCode', authenticateToken, async (req, res) => {
  const { bankCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM BankMaster WHERE BankCode=${bankCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Bank deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.delete('/api/DeleteBankMaster/:bankCode', authenticateToken, (req, res) => {
//   const { bankCode } = req.params;
//   const query = `DELETE FROM BankMaster WHERE BankCode=${bankCode}`;
//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'HamaliType deleted successfully' });
//     }
//   });
// });


//For ItemRateChartMaster
// GET all ItemRateChartMaster entries
app.get('/api/ratechart', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM ItemRateChartMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new ItemRateChartMaster entry
app.post('/api/ratechart', authenticateToken, (req, res) => {
  const { ItemCode, ItemName, ItemDesc, Rate, Remark1, UserID } = req.body;
  const query = `
    INSERT INTO ItemRateChartMaster (ItemCode, ItemName, ItemDesc, Rate, Remark1, UserID)
    VALUES ('${ItemCode}', '${ItemName}', '${ItemDesc}', ${Rate}, '${Remark1}', '${UserID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'ItemRateChartMaster entry created successfully' });
    }
  });
});

// PUT update an existing ItemRateChartMaster entry
app.put('/api/ratechart/:ItemCode', authenticateToken, (req, res) => {
  const { ItemCode } = req.params;
  const { ItemName, ItemDesc, Rate, Remark1, UserID } = req.body;
  const query = `
    UPDATE ItemRateChartMaster
    SET ItemName='${ItemName}', ItemDesc='${ItemDesc}', Rate=${Rate}, Remark1=N'${Remark1}', UserID='${UserID}'
    WHERE ItemCode='${ItemCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'ItemRateChartMaster entry updated successfully',
          ItemCode: ItemCode,
          ItemName,
          ItemDesc,
          Rate,
          Remark1,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a ItemRateChartMaster entry
app.delete('/api/ratechart/:ItemCode', authenticateToken, async (req, res) => {
  const { ItemCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM ItemRateChartMaster WHERE ItemCode='${ItemCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'ItemRateChartMaster entry deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// For YojanaMaster------------------------------------------------------------------------------------
// GET all Yojana entries
app.get('/api/yojana', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM YojanaMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new Yojana entry
app.post('/api/yojana', authenticateToken, (req, res) => {
  const { YojanaCode, YojanaName, YojanaNameEng, Remark1, UserID } = req.body;
  const query = `
    INSERT INTO YojanaMaster (YojanaCode, YojanaName, YojanaNameEng, Remark1, UserID)
    VALUES ('${YojanaCode}', N'${YojanaName}', '${YojanaNameEng}', '${Remark1}', '${UserID}');
  `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Yojana entry created successfully' });
    }
  });
});

// PUT update an existing Yojana entry
app.put('/api/yojana/:YojanaCode', authenticateToken, (req, res) => {
  const { YojanaCode } = req.params;
  const { YojanaName, YojanaNameEng, Remark1, UserID } = req.body;
  const query = `
    UPDATE YojanaMaster
    SET YojanaName=N'${YojanaName}', YojanaNameEng='${YojanaNameEng}', Remark1='${Remark1}', UserID='${UserID}'
    WHERE YojanaCode='${YojanaCode}';
  `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Yojana entry updated successfully',
          YojanaCode,
          YojanaName,
          YojanaNameEng,
          Remark1,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a Yojana entry
app.delete('/api/yojana/:YojanaCode', authenticateToken, async (req, res) => {
  const { YojanaCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM YojanaMaster WHERE YojanaCode='${YojanaCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Yojana entry deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//For MemberMaster
app.get('/api/member', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM MemberMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.post('/api/member', authenticateToken, async (req, res) => {
  const {
    MemberNo,
    MemberName,
    MemberNameEng,
    Address1,
    Address2,
    VillageCode,
    Phone,
    Mobile,
    Email,
    Age,
    MemberTypeCode,
    ProfessionCode,
    CasteCode,
    NomineeName,
    NomineeAddress1,
    NomineeVillageCode,
    NomineeDetails,
    Director,
    DateOfMembership,
    CurrentStatusCode,
    StatusCode,
    MemberOtherDetails2,
    TotShares,
    SharesAmount,
    KYCCode,
    PhotoPath,
    SignPath,
    CompCode,
    USERID,
  } = req.body;

  const query = `
    INSERT INTO MemberMaster (
      MemberNo,
      MemberName,
      MemberNameEng,
      Address1,
      Address2,
      VillageCode,
      Phone,
      Mobile,
      Email,
      Age,
      MemberTypeCode,
      ProfessionCode,
      CasteCode,
      NomineeName,
      NomineeAddress1,
      NomineeVillageCode,
      NomineeDetails,
      Director,
      DateOfMembership,
      CurrentStatusCode,
      MemberOtherDetails1,
      MemberOtherDetails2,
      TotShares,
      SharesAmount,
      KYCCode,
      PhotoPath,
      SignPath,
      CompanyCode,
      USERID
    )
    VALUES (
      '${MemberNo}',
      N'${MemberName}',
      N'${MemberNameEng}',
      N'${Address1}',
      N'${Address2}',
      '${VillageCode}',
      '${Phone}',
      '${Mobile}',
      '${Email}',
      '${Age}',
      '${MemberTypeCode}',
      '${ProfessionCode}',
      '${CasteCode}',
      N'${NomineeName}',
      N'${NomineeAddress1}',
      '${NomineeVillageCode}',
      N'${NomineeDetails}',
      N'${Director}',
      '${DateOfMembership}',
      '${CurrentStatusCode}',
      N'${StatusCode}',
      N'${MemberOtherDetails2}',
      '${TotShares}',
      '${SharesAmount}',
      '${KYCCode}',
      '${PhotoPath}',
      '${SignPath}',
      '${CompCode}',
      '${USERID}'
    );
  `;

  try {
    await sql.query(query); // Assuming you have a method like sql.query for database interaction
    res.json({ message: 'Success' });
  } catch (error) {
    console.log('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/member/:MemberNo', authenticateToken, async (req, res) => {
  const MemberNo = req.params.MemberNo;
  const {
    MemberName,
    MemberNameEng,
    Address1,
    Address2,
    VillageCode,
    Phone,
    Mobile,
    Email,
    Age,
    MemberTypeCode,
    ProfessionCode,
    CasteCode,
    NomineeName,
    NomineeAddress1,
    NomineeVillageCode,
    NomineeDetails,
    Director,
    DateOfMembership,
    CurrentStatusCode,
    StatusCode,
    MemberOtherDetails2,
    TotShares,
    SharesAmount,
    KYCCode,
    PhotoPath,
    SignPath,
    CompCode,
    USERID,
  } = req.body;

  // Logging for debugging
  console.log("Update Member Master - Request Body:", req.body);
  console.log("Update Member Master - Extracted Variables:", {
    MemberNo,
    MemberName,
    MemberNameEng,
    Address1,
    Address2,
    VillageCode,
    Phone,
    Mobile,
    Email,
    Age,
    MemberTypeCode,
    ProfessionCode,
    CasteCode,
    NomineeName,
    NomineeAddress1,
    NomineeVillageCode,
    NomineeDetails,
    Director,
    DateOfMembership,
    CurrentStatusCode,
    StatusCode,
    MemberOtherDetails2,
    TotShares,
    SharesAmount,
    KYCCode,
    PhotoPath,
    SignPath,
    CompCode,
    USERID,
  });

  const query = `
    UPDATE MemberMaster
    SET
      MemberName = N'${MemberName}',
      MemberNameEng = N'${MemberNameEng}',
      Address1 = N'${Address1}',
      Address2 = N'${Address2}',
      VillageCode = '${VillageCode}',
      Phone = '${Phone}',
      Mobile = '${Mobile}',
      Email = '${Email}',
      Age = '${Age}',
      MemberTypeCode = '${MemberTypeCode}',
      ProfessionCode = '${ProfessionCode}',
      CasteCode = '${CasteCode}',
      NomineeName = N'${NomineeName}',
      NomineeAddress1 = N'${NomineeAddress1}',
      NomineeVillageCode = '${NomineeVillageCode}',
      NomineeDetails = N'${NomineeDetails}',
      Director = N'${Director}',
      DateOfMembership = '${DateOfMembership}',
      CurrentStatusCode = '${CurrentStatusCode}',
      MemberOtherDetails1 = N'${StatusCode}',
      MemberOtherDetails2 = N'${MemberOtherDetails2}',
      TotShares = '${TotShares}',
      SharesAmount = '${SharesAmount}',
      KYCCode = '${KYCCode}',
      PhotoPath = '${PhotoPath}',
      SignPath = '${SignPath}',
      CompanyCode = '${CompCode}',
      USERID = '${USERID}'
    WHERE MemberNo = '${MemberNo}';
  `;

  try {
    await sql.query(query);
    res.json({ message: 'Success' });
  } catch (error) {
    console.log('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/member/:MemberNo', authenticateToken, async (req, res) => {
  const MemberNo = req.params.MemberNo;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const query = `DELETE FROM MemberMaster WHERE MemberNo = ${MemberNo}`;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
          } catch (error) {
            console.log('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// app.delete('/api/member/:MemberNo', authenticateToken, async (req, res) => {
//   const MemberNo = req.params.MemberNo;
//   const query = `
//     DELETE FROM MemberMaster WHERE MemberNo = ${MemberNo};
//   `;

//   try {
//     await sql.query(query); // Assuming you have a method like sql.query for database interaction
//     res.json({ message: 'Success' });
//   } catch (error) {
//     console.log('Error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

//For ShopMaster
app.get('/api/shop', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM ShopMaster'
  sql.query(query, (err, result) => {
    if (err) {
      console.log('error:', err);
      res.status(500).json({ error: 'internal server error' });
    } else {
      res.json(result.recordset);
    }
  })
});

// POST endpoint for inserting data
app.post('/api/shop', authenticateToken, (req, res) => {
  const { ShopCode, ShopName, ShopNo, ShopAddress, ShopPhone, ShopDistance,ShopDistanceDirect, TalukaCode, Remark1, Remark2, Remark3, UserID } = req.body;
  const query = `INSERT INTO ShopMaster (ShopCode, ShopName, ShopNo, ShopAddress, ShopPhone, ShopDistance, ShopDistanceDirect, TalukaCode, Remark1, Remark2, Remark3, UserID) 
                 VALUES ('${ShopCode}', N'${ShopName}', '${ShopNo}', N'${ShopAddress}', '${ShopPhone}', '${ShopDistance}','${ShopDistanceDirect}', '${TalukaCode}', N'${Remark1}', N'${Remark2}', N'${Remark3}', '${UserID}')`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Item created successfully' });
    }
  });
});

// PUT endpoint for updating data
app.put('/api/shop/:ShopCode', authenticateToken, (req, res) => {
  const { ShopCode } = req.params;
  const { ShopName, ShopNo, ShopAddress, ShopPhone, ShopDistance,ShopDistanceDirect, TalukaCode, Remark1, Remark2, Remark3, UserID } = req.body;
  const query = `UPDATE ShopMaster 
                 SET ShopName = N'${ShopName}', 
                     ShopNo = '${ShopNo}', 
                     ShopAddress = N'${ShopAddress}', 
                     ShopPhone = '${ShopPhone}', 
                     ShopDistance = '${ShopDistance}', 
                     ShopDistanceDirect = '${ShopDistanceDirect}',
                     TalukaCode = '${TalukaCode}', 
                     Remark1 = N'${Remark1}', 
                     Remark2 = N'${Remark2}', 
                     Remark3 = N'${Remark3}', 
                     UserID = '${UserID}' 
                 WHERE ShopCode = '${ShopCode}'`;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Item updated successfully' });
    }
  });
});

app.delete('/api/shop/:ShopCode', authenticateToken, async (req, res) => {
  const { ShopCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM ShopMaster WHERE ShopCode='${ShopCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'DeptMaster deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For GangSubMaster------------------------------------------------------------------------------------

// GET all gang
app.get('/api/gangsub', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM GangSubMaster';
  // const query = 'SELECT DISTINCT GangCode FROM GangSubMaster ORDER BY GangCode ASC';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new Gang
app.post('/api/gangsub', authenticateToken, (req, res) => {
  const { requestData, GangCode } = req.body;
  console.log('requestData', requestData);

  if (!requestData || !Array.isArray(requestData)) {
    res.status(400).json({ error: 'Invalid requestData format' });
    return;
  }

  const values = requestData.map(entry => `(${entry.GangCode}, ${entry.EmpCode}, '${entry.UserID}')`).join(',');
  const query = `
    DELETE FROM GangSubMaster WHERE GangCode = ${GangCode};

    INSERT INTO GangSubMaster (GangCode, EmpCode, UserID)
    VALUES ${values};
  `;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      console.log('query', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Gang created successfully' });
    }
  });
});

// DELETE a Gang
app.delete('/api/gangsub/:GangCode', authenticateToken, async (req, res) => {
  const { GangCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM GangSubMaster WHERE GangCode=${GangCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'GangSub deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// For AttendenceEntries

app.get('/api/AttendanceEntries/:Talukacode/:selectedDate', authenticateToken, (req, res) => {
  const {selectedDate, Talukacode} = req.params;
  const query = `SELECT * FROM AttendanceEntry WHERE TrDate = '${selectedDate}' AND Talukacode = ${Talukacode}  ORDER BY EntryNo`;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('log:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/attendance', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM AttendanceEntry';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});


app.post('/api/AttendanceEntriesPost/:entryNo/:trdate', authenticateToken, (req, res) => {
  const entryNo = req.params.entryNo;
  const trdate = req.params.trdate;
  const {requestData, CompCode,YearCode,DeptCode, TalukaCode} = req.body;
  const values = requestData.map(entry => `(
      '${entryNo}', 
      '${entry.trdate}', 
      '${entry.memberTypeCode}', 
      '${entry.gangCode}', 
      '${entry.DeptCode}', 
      '${entry.YearCode}', 
      '${entry.CompCode}', 
      '${entry.USERID}', 
      '${entry.EmpCode}', 
      ${entry.Checked},
      ${TalukaCode}
  )`).join(',');

  let query = `
      delete from AttendanceEntry where EntryNo = ${entryNo} AND  Trdate = '${trdate}' AND CompCode = ${CompCode} AND YearCode = ${YearCode}
       AND DeptCode = ${DeptCode} AND Talukacode = ${TalukaCode};

      INSERT INTO AttendanceEntry (
          EntryNo, 
          TrDate, 
          EmpTypeCode, 
          GangCode, 
          DeptCode, 
          YearCode, 
          CompCode, 
          USERID,  
          EmpCode, 
          PresentYN,
          Talukacode
      ) VALUES ${values}`;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});


app.delete('/api/AttendanceEntriesDelete/:EntryNo/:selectedDate', authenticateToken, async (req, res) => {
  const { EntryNo, selectedDate } = req.params;
  const UserName = req.headers['username'];
  const {CompCode, YearCode, DeptCode, TalukaCode} = req.query;
  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;
    console.log('userPermissionsQuery:', userPermissionsQuery);
    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const query = `DELETE FROM AttendanceEntry WHERE EntryNo = ${EntryNo} AND TrDate ='${selectedDate}' AND DeptCode = ${DeptCode} 
          AND YearCode = ${YearCode} AND Compcode = ${CompCode} AND Talukacode = ${TalukaCode}`;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
          } catch (error) {
            console.log('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/railwaywagon/:DeptCode/:CompCode/:YearCode', authenticateToken, (req, res) => {
  const { DeptCode, CompCode, YearCode } = req.params;
  const query = `SELECT * FROM RRWagonEntry WHERE DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND CompCode = ${CompCode}`;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/Inwardrailwaywagon/:CompCode/:YearCode', authenticateToken, (req, res) => {
  const {CompCode , YearCode } = req.params;
  const query = `SELECT * FROM RRWagonEntry WHERE CompCode = ${CompCode} And YearCode = ${YearCode}`;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/Collector', authenticateToken, (req, res) => {
  const { CompCode, YearCode } = req.query;
  
  // Ensure CompCode and YearCode are numbers
  if (isNaN(CompCode) || isNaN(YearCode)) {
    return res.status(400).json({ error: 'Invalid CompCode or YearCode' });
  }

  const query = `
    SELECT * 
    FROM RRWagonEntry 
    WHERE CompCode = @CompCode AND YearCode = @YearCode
  `;

  const request = new sql.Request();
  request.input('CompCode', sql.Int, CompCode);
  request.input('YearCode', sql.Int, YearCode);

  request.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});


app.post('/api/railwaywagon/:EntryNo', authenticateToken, (req, res) => {
  const entryNo = req.params.EntryNo;
  const { requestData, CompCode, YearCode, DeptCode } = req.body;
  const values = requestData.map(entry => `(
    ${entryNo}, 
    '${entry.TrDate}', 
    '${entry.RRNo ? entry.RRNo : entry.RRNO}',
    ${entry.TotalWagons}, 
    ${entry.RakeNo}, 
    '${entry.RakeDate}', 
    '${entry.RakeTime}', 
    '${entry.StationName ? entry.StationName : entry.StationCode}',
    '${entry.WagonNo}',
    ${entry.ProductCode},
    ${entry.Qty},
    ${entry.Weight},
    '${entry.SubAcCode ? entry.SubAcCode : entry.PartyCode}',
    ${entry.TotalQty},  
    ${entry.TotalWeight},
    ${entry.DeptCode},
    ${entry.YearCode},
    ${entry.CompCode ? entry.CompCode : entry.Compcode},
    '${entry.UserID}',
    ${entry.ID ? entry.ID : entry.WagonEntryNo},
    'RRW'
    )`).join(',');

  let query = `
    delete from RRWagonEntry where EntryNo = ${entryNo} AND Flag = 'RRW' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND CompCode = ${CompCode};

    INSERT INTO RRWagonEntry (
      EntryNo,
      TrDate,
      RRNo,
      TotalWagons,
      RakeNo,
      RakeDate,
      RakeTime,
      StationCode,
      WagonNo,
      ProductCode,
      Qty,
      Weight,
      PartyCode,
      TotalQty,
      TotalWeight,
      DeptCode,
      YearCode,
      Compcode,
      UserID,
      WagonEntryNo,
      Flag
    ) VALUES ${values};`;


  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);

      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.delete('/api/railwaywagon/:EntryNo/:DeptCode/:CompCode/:YearCode', authenticateToken, async (req, res) => {
  const { EntryNo, CompCode, YearCode, DeptCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const query = `DELETE FROM RRWagonEntry WHERE EntryNo = ${EntryNo} AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND CompCode = ${CompCode};`;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
          } catch (error) {
            console.log('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// for RRDispatch

app.post('/api/RRDispatch/:EntryNo', authenticateToken, (req, res) => {
  const entryNo = req.params.EntryNo;
  const { requestData, DeptCode, YearCode, CompCode } = req.body;

  if (requestData.length === 0) {
    // If the requestData array is empty, just delete records and return.
    const deleteQuery = ` DELETE FROM RRWagonEntry 
      WHERE WagonEntryNo IN (${requestData.map(entry => entry.WagonEntryNo).join(',')})
      AND Flag = 'RRD' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode} AND EntryNo =  ${entryNo};`;

    sql.query(deleteQuery, (err, result) => {
      if (err) {
        console.log('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'Records deleted successfully' });
      }
    });
  } else {
    // If requestData array is not empty, proceed with the insert operation.
    const values = requestData.map(entry => `(
          ${entryNo}, 
          '${entry.TrDate}', 
          '${entry.RRNo ? entry.RRNo : entry.RRNO}',
          ${entry.TotalWagons}, 
          ${entry.RakeNo}, 
          '${entry.RakeDate}', 
          '${entry.RakeTime}', 
          '${entry.StationName ? entry.StationName : entry.StationCode}',
          '${entry.WagonNo}',
          ${entry.ProductCode},
          ${entry.LoadQty || entry.Qty},
          ${entry.Weight},
          '${entry.SubAcCode ? entry.SubAcCode : entry.PartyCode}',
          ${entry.TotalQty},  
          ${entry.TotalWeight},
          ${entry.DeptCode},
          ${entry.YearCode},
          ${entry.CompCode ? entry.CompCode : entry.Compcode},
          '${entry.UserID}',
          ${entry.WagonEntryNo},
          ${entry.ID ? entry.ID : entry.DesptachEntryNo},
          ${entry.GangCode}, 
          '${entry.HamaliTypeCode}',
          ${entry.VehicleCode},
          '${entry.DriverName}',
          ${entry.RPHQty || 0},
          ${entry.BuiltyNo ? entry.BuiltyNo : entry.BiltiNo},
          ${entry.UnloadTypeCode},
          ${entry.DepartmentCode || entry.LocationCode},
          'RRD'
      )`).join(',');

    const insertQuery = `
          DELETE FROM RRWagonEntry 
          WHERE WagonEntryNo IN (${requestData.map(entry => entry.WagonEntryNo).join(',')})
           AND Flag = 'RRD' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode} AND EntryNo =  ${entryNo};
      
          INSERT INTO RRWagonEntry (
              EntryNo,
              TrDate,
              RRNo,
              TotalWagons,
              RakeNo,
              RakeDate,
              RakeTime,
              StationCode,
              WagonNo,
              ProductCode,
              Qty,
              Weight,
              PartyCode,
              TotalQty,
              TotalWeight,
              DeptCode,
              YearCode,
              Compcode,
              UserID,
              WagonEntryNo,
              DesptachEntryNo,
              GangCode,
              HamaliTypeCode,
              VehicleCode,
              DriverName,
              RPHQty,
              BiltiNo,
              UnloadTypeCode,
              LocationCode,
              Flag
          ) VALUES ${values};`;

    sql.query(insertQuery, (err, result) => {
      if (err) {
        console.log('Error:', err);
        console.log('query:', insertQuery);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json({ message: 'Data saved successfully' });
      }
    });
  }
});

// app.post('/api/singleSave', authenticateToken, (req, res) => {
//   const {
//     EntryNo,
//     TrDate,
//     PartyCode,
//     ProductCode,
//     RakeNo,
//     RRNo,
//     TotalWagons,
//     RakeDate,
//     RakeTime,
//     StationName,
//     TotalQty,
//     TotalWeight,
//     DeptCode,
//     YearCode,
//     CompCode,
//     WagonNo,
//     Weight,
//     WagonEntryNo,
//     UserID,
//     GangCode,
//     HamaliTypeCode,
//     VehicleCode,
//     DriverName,
//     LoadQty,
//     RPHQty,
//     BuiltyNo,
//     UnloadTypeCode,
//     DepartmentCode } = req.body;

//   const query = `
//       DELETE FROM RRWagonEntry 
//           WHERE WagonEntryNo = ${WagonEntryNo}
//           AND Flag = 'RRD' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode} AND EntryNo =  ${EntryNo};

//       INSERT INTO RRWagonEntry (EntryNo,
//               TrDate,
//               RRNo,
//               TotalWagons,
//               RakeNo,
//               RakeDate,
//               RakeTime,
//               StationCode,
//               WagonNo,
//               ProductCode,
//               Qty,
//               Weight,
//               PartyCode,
//               TotalQty,
//               TotalWeight,
//               DeptCode,
//               YearCode,
//               Compcode,
//               UserID,
//               WagonEntryNo,
//               DesptachEntryNo,
//               GangCode,
//               HamaliTypeCode,
//               VehicleCode,
//               DriverName,
//               RPHQty,
//               BiltiNo,
//               UnloadTypeCode,
//               LocationCode,
//               Flag)
//       VALUES ('${EntryNo}', '${TrDate}','${RRNo}','${TotalWagons}', '${RakeNo}','${RakeDate}','${RakeTime}','${StationName}','${WagonNo}','${ProductCode}','${LoadQty}','${Weight}','${PartyCode}', '${TotalQty}', '${TotalWeight}', '${DeptCode}','${YearCode}','${CompCode}','${UserID}', '${WagonEntryNo}',  '${GangCode}', '${HamaliTypeCode}', '${VehicleCode}', '${DriverName}', '${RPHQty}', '${BuiltyNo}', '${UnloadTypeCode}', '${DepartmentCode}', 'RRD');
//     `;

//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Entry saved successfully' });
//     }
//   });
// });

app.post('/api/singleSave', authenticateToken, (req, res) => {
  const {
    EntryNo,
    TrDate,
    PartyCode,
    ProductCode,
    RakeNo,
    RRNo,
    TotalWagons,
    RakeDate,
    RakeTime,
    StationName,
    TotalQty,
    TotalWeight,
    DeptCode,
    YearCode,
    CompCode,
    WagonNo,
    Weight,
    WagonEntryNo,
    UserID,
    GangCode,
    HamaliTypeCode,
    VehicleCode,
    DriverName,
    LoadQty,
    RPHQty,
    BuiltyNo,
    UnloadTypeCode,
    DepartmentCode,
    ID
  } = req.body;

  const query = `
      DELETE FROM RRWagonEntry 
      WHERE WagonEntryNo = ${WagonEntryNo}
      AND Flag = 'RRD' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode} AND EntryNo = ${EntryNo} AND DesptachEntryNo = ${ID} AND BiltiNo = ${BuiltyNo};

      INSERT INTO RRWagonEntry (
        EntryNo,
        TrDate,
        RRNo,
        TotalWagons,
        RakeNo,
        RakeDate,
        RakeTime,
        StationCode,
        WagonNo,
        ProductCode,
        Qty,
        Weight,
        PartyCode,
        TotalQty,
        TotalWeight,
        DeptCode,
        YearCode,
        Compcode,
        UserID,
        WagonEntryNo,
        GangCode,
        HamaliTypeCode,
        VehicleCode,
        DriverName,
        RPHQty,
        BiltiNo,
        UnloadTypeCode,
        LocationCode,
        DesptachEntryNo,
        Flag
      ) VALUES (
        '${EntryNo}', 
        '${TrDate}', 
        '${RRNo}', 
        '${TotalWagons}', 
        '${RakeNo}', 
        '${RakeDate}', 
        '${RakeTime}', 
        '${StationName}', 
        '${WagonNo}', 
        '${ProductCode}', 
        '${LoadQty}', 
        '${Weight}', 
        '${PartyCode}', 
        '${TotalQty}', 
        '${TotalWeight}', 
        '${DeptCode}', 
        '${YearCode}', 
        '${CompCode}', 
        '${UserID}', 
        '${WagonEntryNo}', 
        '${GangCode}', 
        '${HamaliTypeCode}', 
        '${VehicleCode}', 
        '${DriverName}', 
        '${RPHQty}', 
        '${BuiltyNo}', 
        '${UnloadTypeCode}', 
        '${DepartmentCode}', 
        '${ID}', 
        'RRD'
      );
    `;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Entry saved successfully' });
    }
  });
});

app.delete('/api/singleDel/:EntryNo', authenticateToken, async (req, res) => {
  const EntryNo = req.params.EntryNo;
  const UserName = req.headers['username'];
  const { WagonEntryNo, DeptCode, YearCode, CompCode, ID, BuiltyNo } = req.query;

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const query = ` DELETE FROM RRWagonEntry 
            WHERE WagonEntryNo = ${WagonEntryNo}
            AND Flag = 'RRD' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode} AND EntryNo = ${EntryNo} AND DesptachEntryNo = ${ID} AND BiltiNo = ${BuiltyNo};
          `;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
          } catch (error) {
            console.log('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// for CWC Inward
app.put('/api/CWCInward/:DespatchCode', authenticateToken, (req, res) => {
  const { DespatchCode } = req.params;
  const {
    NetWeight,
    GangCode2,
    StackNo,
    HamaliTypeCode2,
    WagonEntryNo,
    EntryNo,
    otherAmt
  } = req.body;
  const query = `
  UPDATE RRWagonEntry 
  SET 
  Weight = N'${NetWeight}', 
  GangCode1 = N'${GangCode2}', 
  HamaliTypeCode1 = N'${HamaliTypeCode2}', 
  OtherAmt = '${otherAmt}'
  WHERE  Flag = 'RRD'AND EntryNo = ${EntryNo} AND WagonEntryNo = ${WagonEntryNo}  AND DesptachEntryNo = ${DespatchCode};
`;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Product updated successfully',
          NetWeight,
          GangCode2,
          StackNo,
          HamaliTypeCode2,
          WagonEntryNo,
          EntryNo,
          otherAmt
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

//for DO entry 
app.post('/api/DoEntry/:DoEntryNo', authenticateToken, (req, res) => {
  const entryNo = req.params.DoEntryNo;
  const {requestData, CompCode,YearCode,DeptCode} = req.body;
  const values = requestData.map(entry => `(
    ${entryNo}, 
    ${entry.DONo}, 
    '${entry.TrDate}', 
    '${entry.LockDate}', 
    '${entry.DoMonth ? entry.DoMonth : entry.TrMonth}',
    ${entry.ProductCode},
    ${entry.YojanaCode ? entry.YojanaCode : entry.ItemCode},
    ${entry.TalukaCode}, 
    ${entry.Weight}, 
    ${entry.GoDownWeight ? entry.GoDownWeight || 0 : entry.GodwonWeight || 0}, 
    ${entry.DirectWeight},
    ${entry.TotTalukaWeight ? entry.TotTalukaWeight || 0 : entry.TalukaWeight || 0}, 
    '${entry.Remark ? entry.Remark : entry.Remark1}',
    ${entry.DeptCode},
    ${entry.YearCode},
    ${entry.CompCode ? entry.CompCode : entry.Compcode},
    '${entry.UserID}',
    ${entry.editRoomId ? entry.editRoomId : entry.DesptachEntryNo},
    'DO'
    )`).join(',');

  let query = `
    delete from RRWagonEntry where EntryNo = ${entryNo} AND Flag = 'DO' AND CompCode = ${CompCode} AND YearCode = ${YearCode} AND DeptCode = ${DeptCode};

    INSERT INTO RRWagonEntry (
      EntryNo,
      DONo,
      TrDate,
      Lockdate,
      TrMonth,
      ProductCode,
      YojanaCode,
      TalukaCode,
      Weight,
      GodwonWeight,
      DirectWeight,
      TalukaWeight,
      Remark1,
      DeptCode,
      YearCode,
      Compcode,
      UserID,
      DesptachEntryNo,
      Flag
    ) VALUES ${values};`;


  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);

      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.delete('/api/DELDoEntry/:EntryNo', authenticateToken, async (req, res) => {
  const EntryNo = req.params.EntryNo;
  const UserName = req.headers['username'];
  const {CompCode,YearCode,DeptCode} = req.query;
  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const query = `DELETE FROM RRWagonEntry WHERE EntryNo = ${EntryNo} AND Flag ='DO' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode}`;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
          } catch (error) {
            console.log('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



//For CWCD ENtry
app.post('/api/CWCDEntry/:EntryNo', authenticateToken, (req, res) => {
  const entryNo = req.params.EntryNo;
  const {requestData, CompCode,YearCode,DeptCode} = req.body;
  const values = requestData.map(entry => `(
    ${entryNo}, 
    '${entry.TrDate}', 
    '${entry.DONo}', 
    '${entry.DoDate ? entry.DoDate : entry.TrMonth}',
    ${entry.ProductCode},
    ${entry.YojanaCode ? entry.YojanaCode : entry.ItemCode},
    ${entry.TalukaCode}, 
    ${entry.GangCode}, 
    ${entry.HamaliTypeCode},
    ${entry.Qty}, 
    ${entry.Weight}, 
    '${entry.VehicleCode}',
    ${entry.BuiltyTPNO || entry.BiltiNo},
    ${entry.locationCode || entry.LocationCode},
    ${entry.DeptCode},
    ${entry.YearCode},
    ${entry.CompCode ? entry.CompCode : entry.Compcode},
    '${entry.UserID}',
    ${entry.editRoomId ? entry.editRoomId : entry.DesptachEntryNo},
    'CWCD'
    )`).join(',');

  let query = `
    delete from RRWagonEntry where EntryNo = ${entryNo} AND Flag = 'CWCD' AND CompCode = ${CompCode} AND YearCode = ${YearCode} AND DeptCode = ${DeptCode};

    INSERT INTO RRWagonEntry (
      EntryNo,
      TrDate,
      DONo,
      TrMonth,
      ProductCode,
      YojanaCode,
      TalukaCode,
      GangCode,
      HamaliTypeCode,
      Qty,
      Weight,
      VehicleCode,
      BiltiNo,
      LocationCode,
      DeptCode,
      YearCode,
      Compcode,
      UserID,
      DesptachEntryNo,
      Flag
    ) VALUES ${values};`;


  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);

      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.delete('/api/CWCDEntry/:EntryNo', authenticateToken, async (req, res) => {
  const EntryNo = req.params.EntryNo;
  const UserName = req.headers['username'];
  const {CompCode,YearCode,DeptCode} = req.query;


  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const query = `DELETE FROM RRWagonEntry WHERE EntryNo = ${EntryNo} AND Flag ='CWCD' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode} `;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
          } catch (error) {
            console.log('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//FOR TalukaGodownInward
// app.put('/api/AcceptDespatch/:EntryNo', authenticateToken, (req, res) => {
//   const { EntryNo } = req.params;
//   const { GangCode, statusCode, HamaliTypeCode, CompCode,YearCode,DeptCode,TalukaCode } = req.body;
//   const query = `
//     UPDATE RRWagonEntry 
//     SET 
//     StatusCode = ${statusCode},
//     GangCode1 = ${GangCode},
//     HamaliTypeCode1 = ${HamaliTypeCode}
//     WHERE  Flag = 'CWCD'AND EntryNo = ${EntryNo} AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode} AND TalukaCode = ${TalukaCode};
// `;

//   sql.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       if (result.rowsAffected && result.rowsAffected[0] > 0) {
//         res.json({
//           message: 'Accepted successfully'
//         });
//       } else {
//         res.status(404).json({ error: 'Record not found' });
//       }
//     }
//   });
// });

app.put('/api/AcceptDespatch/:EntryNo', authenticateToken, (req, res) => {
  const { requestData, CompCode, YearCode, DeptCode } = req.body;

  const updatePromises = requestData.map(entry => {
      const query = `
          UPDATE RRWagonEntry 
          SET 
              StatusCode = @statusCode,
              GangCode1 = @GangCode,
              HamaliTypeCode1 = @HamaliTypeCode,
              InwardQty = @Qty,
              InwardDate = @TrDate
          WHERE  
              Flag = 'CWCD' AND 
              EntryNo = @EntryNo AND 
              YearCode = @YearCode AND 
              CompCode = @CompCode AND 
              TalukaCode = @TalukaCode AND
              DesptachEntryNo = @DesptachEntryNo;
      `;

      const request = new sql.Request();
      request.input('statusCode', sql.Int, 1); // Assuming statusCode is always 1
      request.input('GangCode', sql.Int, entry.GangCode1);
      request.input('HamaliTypeCode', sql.Int, entry.HamaliTypeCode1);
      request.input('EntryNo', sql.Int, entry.EntryNo);
      request.input('DeptCode', sql.Int, DeptCode);
      request.input('YearCode', sql.Int, YearCode);
      request.input('CompCode', sql.Int, CompCode);
      request.input('TalukaCode', sql.Int, entry.TalukaCode);
      request.input('Qty', sql.Decimal(15, 6), entry.Qty);
      request.input('TrDate', sql.VarChar, entry.TrDate);
      request.input('DesptachEntryNo', sql.Int, entry.DesptachEntryNo);
      

      return request.query(query);
  });

  Promise.all(updatePromises)
      .then(results => {
          res.json({ message: 'Data updated successfully' });
      })
      .catch(err => {
          console.log('Error:', err);
          res.status(500).json({ error: 'Internal server error' });
      });
});



//For TalukaGodownOutWard
app.post('/api/TGDEntry/:EntryNo', authenticateToken, (req, res) => {
  const entryNo = req.params.EntryNo;
  const {requestData, CompCode,YearCode,DeptCode, TalukaCode} = req.body;
  const values = requestData.map(entry => `(
    ${entryNo}, 
    '${entry.TrDate}', 
    ${entry.ProductCode},
    ${entry.YojanaCode ? entry.YojanaCode : entry.editRoomId},
    ${entry.ShopCode ? entry.ShopCode : entry.PartyCode}, 
    ${entry.GangCode}, 
    ${entry.HamaliTypeCode},
    ${entry.Qty}, 
    '${entry.VehicleCode}',
    ${entry.BuiltyTPNO ? entry.BuiltyTPNO : entry.BiltiNo},
    ${entry.locationCode ? entry.locationCode : entry.LocationCode},
    ${entry.DeptCode},
    ${entry.YearCode},
    ${entry.CompCode ? entry.CompCode : entry.Compcode},
    '${entry.UserID}',
    ${entry.editRoomId ? entry.editRoomId : entry.DesptachEntryNo},
    ${entry.Weight},
    ${entry.PermitNo},
    '${entry.PermitDate}',
    '${entry.PermitMonth}',
      ${TalukaCode},
      'TGD'
    )`).join(',');

  let query = `
    delete from RRWagonEntry where EntryNo = ${entryNo} AND Flag = 'TGD'  AND CompCode = ${CompCode} AND YearCode = ${YearCode} AND 
    DeptCode = ${DeptCode} AND TalukaCode = ${TalukaCode};

    INSERT INTO RRWagonEntry (
      EntryNo,
      TrDate,
      ProductCode,
      YojanaCode,
      PartyCode,
      GangCode,
      HamaliTypeCode,
      Qty,
      VehicleCode,
      BiltiNo,
      LocationCode,
      DeptCode,
      YearCode,
      Compcode,
      UserID,
      DesptachEntryNo,
      Weight,
      PermitNo,
      PermitDate,
      PermitMonth,
      TalukaCode,
      Flag
    ) VALUES ${values};`;


  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);

      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.delete('/api/TGDEntry/:EntryNo', authenticateToken, async (req, res) => {
  const EntryNo = req.params.EntryNo;
  const UserName = req.headers['username'];
  const {CompCode, YearCode, DeptCode, TalukaCode} = req.query;

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const query = `DELETE FROM RRWagonEntry WHERE EntryNo = ${EntryNo} AND Flag ='TGD'  AND CompCode = ${CompCode} AND YearCode = ${YearCode} 
          AND DeptCode = ${DeptCode} AND TalukaCode = ${TalukaCode}`;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
            console.log('query:', query);

          } catch (error) {
            console.log('Error:', error);
            console.log('query:', query);

            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//For Direct Despatch Entry
app.post('/api/DD/:EntryNo', authenticateToken, (req, res) => {
  const entryNo = req.params.EntryNo;
  const {requestData, CompCode,YearCode,DeptCode} = req.body;
  const values = requestData.map(entry => `(
    ${entryNo}, 
    '${entry.TrDate}', 
    ${entry.ProductCode},
    ${entry.YojanaCode ? entry.YojanaCode : entry.editRoomId},
    ${entry.ShopCode ? entry.ShopCode : entry.PartyCode}, 
    ${entry.GangCode}, 
    ${entry.HamaliTypeCode},
    ${entry.Qty}, 
    ${entry.Weight}, 
    ${entry.PermitNo}, 
    '${entry.PermitDate}', 
    '${entry.PermitMonth}', 
    '${entry.VehicleCode}',
    ${entry.DeptCode},
    ${entry.YearCode},
    ${entry.CompCode ? entry.CompCode : entry.Compcode},
    '${entry.UserID}',
    ${entry.editRoomId ? entry.editRoomId : entry.DesptachEntryNo},
    'DD'
    )`).join(',');

  let query = `
    delete from RRWagonEntry where EntryNo = ${entryNo} AND Flag = 'DD' AND CompCode = ${CompCode} AND YearCode = ${YearCode} AND DeptCode = ${DeptCode};

    INSERT INTO RRWagonEntry (
      EntryNo,
      TrDate,
      ProductCode,
      YojanaCode,
      PartyCode,
      GangCode,
      HamaliTypeCode,
      Qty,
      Weight,
      PermitNo,
      PermitDate,
      PermitMonth,
      VehicleCode,
      DeptCode,
      YearCode,
      Compcode,
      UserID,
      DesptachEntryNo,
      Flag
    ) VALUES ${values};`;


  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);

      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.delete('/api/DD/:EntryNo', authenticateToken, async (req, res) => {
  const EntryNo = req.params.EntryNo;
  const UserName = req.headers['username'];
  const {CompCode,YearCode,DeptCode} = req.query;
  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const query = `DELETE FROM RRWagonEntry WHERE EntryNo = ${EntryNo} AND Flag ='DD'  AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode}`;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
          } catch (error) {
            console.log('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// For DeductionEntry
// Fetch DeductionEntry
app.get('/api/DeductionEntry/:DeptCode/:CompCode/:YearCode', authenticateToken, (req, res) => {
  const { DeptCode, CompCode, YearCode } = req.params;
  const query = `SELECT * FROM DeductionEntry WHERE DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode}`;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// Add DeductionEntry
// app.post('/api/DeductionEntry/:EntryNo', authenticateToken, (req, res) => {
//   const entryNo = req.params.EntryNo;
//   const {requestData, AcCode} = req.body;
//   const values = requestData.map(entry => `(
//       ${entry.EntryNo}, 
//       '${entry.TrDate}', 
//       ${entry.LocationCode},
//       ${entry.DeductionTypeCode},
//       ${entry.DieselCompanyCode},
//       '${entry.BillNo}',
//       ${entry.Qty},
//       ${entry.Amt},
//       '${entry.Remark1}',
//       '${entry.UserID}',
//       ${entry.Compcode},
//       ${entry.DeptCode},
//       ${entry.YearCode},
//       ${AcCode},
//       'DP'
//   )`).join(',');

//   let query = `
//       DELETE FROM DeductionEntry WHERE EntryNo = ${entryNo} AND TE.DeptCode = '${DeptCode}' AND TE.YearCode = '${YearCode}'  AND TE.CompCode = '${CompCode};

//       INSERT INTO DeductionEntry (
//           EntryNo,
//           TrDate,
//           LocationCode,
//           DeductionTypeCode,
//           DieselCompanyCode,
//           BillNo,
//           Qty,
//           Amt,
//           Remark1,
//           UserID,
//           Compcode,
//           DeptCode,
//           YearCode,
//           Accode,
//           Flag
//       ) VALUES ${values};
//       `;

//   sql.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       console.log('query:', query);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Data saved successfully' });
//     }
//   });
// });

app.post('/api/DeductionEntry/:EntryNo', authenticateToken, (req, res) => {
  const entryNo = req.params.EntryNo;
  const { requestData, AcCode, flag, DeptCode, YearCode, Compcode, AutoEntryData, selectGrp, operation } = req.body; // assuming flag is part of the request body
  const values = requestData.map(entry => `(
      ${entry.EntryNo}, 
      '${entry.TrDate}', 
      ${entry.LocationCode},
      ${entry.DeductionTypeCode},
      ${entry.DieselCompanyCode},
      '${entry.BillNo}',
      ${entry.Qty},
      ${entry.Amt},
      '${entry.Remark1}',
      '${entry.UserID}',
      ${entry.Compcode},
      ${entry.DeptCode},
      ${entry.YearCode},
      ${entry.VehicleCode},
      ${AcCode},
      'DE'
  )`).join(',');

  let query = `
      DELETE FROM DeductionEntry WHERE EntryNo = ${entryNo} AND DeptCode = '${DeptCode}' AND YearCode = '${YearCode}' AND CompCode = '${Compcode}';

      INSERT INTO DeductionEntry (
          EntryNo,
          TrDate,
          LocationCode,
          DeductionTypeCode,
          DieselCompanyCode,
          BillNo,
          Qty,
          Amt,
          Remark1,
          UserID,
          Compcode,
          DeptCode,
          YearCode,
          VehicleCode,
          Accode,
          Flag
      ) VALUES ${values};
  `;
  if (operation === 'AutoEntry') {
    const values1 = AutoEntryData.map(entry => {
      const deductionType = selectGrp.find(deduction => deduction.DeductionTypeCode == entry.DeductionTypeCode);
      const acCode = deductionType ? deductionType.AcCode : null;
      return `(
      ${entry.EntryNo}, 
      '${entry.TrDate}', 
      ${acCode ? acCode : AcCode},
      ${entry.VehicleCode},
      ${entry.CrAmt ? entry.CrAmt : 0},
      ${entry.Amt ? entry.Amt : 0},
      '${entry.Remark1}',
      '${entry.BillNo}',
      ${entry.Qty},
      '${entry.UserID}',
      ${entry.Compcode},
      ${entry.DeptCode},
      ${entry.YearCode},
      'DE',
      ${entry.CrAmt ? 0 : 5},
      1
  )`}).join(',');

    const dpQuery = `
      DELETE FROM TranEntry
      WHERE EntryNo = ${entryNo} AND Flag = 'DE' AND DeptCode = '${DeptCode}' AND YearCode = '${YearCode}' AND CompCode = '${Compcode}';
      
      INSERT INTO TranEntry (
          EntryNo,
          TrDate,
          AcCode,
          SubAcCode,
          CrAmt,
          DrAmt,
          Narration1,
          Narration2,
          Qty,
          UserID,
          CompCode,
          DeptCode,
          YearCode,
          Flag,
          SubLedgerGroupCode,
          CashOrTr
      ) VALUES ${values1}; `;
    query += dpQuery;
  }

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});



// Delete DeductionEntry
app.delete('/api/DeductionEntry/:EntryNo', authenticateToken, async (req, res) => {
  const EntryNo = req.params.EntryNo;
  const UserName = req.headers['username'];
  const {CompCode,YearCode,DeptCode} = req.query;

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const query = `DELETE FROM DeductionEntry WHERE EntryNo = ${EntryNo} AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND CompCode = ${CompCode}`;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
          } catch (error) {
            console.log('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// For deduction Type Master------------------------------------------------------------------------------------

// GET all deduction Type Master
app.get('/api/deduction-type', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM DeductionTypeMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new caste
// POST create a new deduction type
app.post('/api/deduction-type', authenticateToken, (req, res) => {
  const { DeductionTypeCode, DeductionType, AcCode, UserID } = req.body;
  const query = `
      INSERT INTO DeductionTypeMaster (DeductionTypeCode, DeductionType, AcCode, UserID)
      VALUES ('${DeductionTypeCode}', N'${DeductionType}', '${AcCode}', '${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Deduction type created successfully' });
    }
  });
});

// PUT update an existing deduction type
app.put('/api/deduction-type/:DeductionTypeCode', authenticateToken, (req, res) => {
  const { DeductionTypeCode } = req.params;
  const { DeductionType, AcCode, UserID } = req.body;
  const query = `
      UPDATE DeductionTypeMaster
      SET DeductionType=N'${DeductionType}', AcCode = '${AcCode}', UserID='${UserID}'
      WHERE DeductionTypeCode='${DeductionTypeCode}';
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Deduction type updated successfully',
          DeductionTypeCode: DeductionTypeCode,
          DeductionType,
          AcCode,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a deduction type
app.delete('/api/deduction-type/:deductionTypeCode', authenticateToken, async (req, res) => {
  const { deductionTypeCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM DeductionTypeMaster WHERE DeductionTypeCode='${deductionTypeCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Deduction type deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//For Diesel Company
// GET all diesel company
app.get('/api/diesel-company', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM DieselCompanyMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST create a new diesel company
app.post('/api/diesel-company', authenticateToken, (req, res) => {
  const { DieselCompanyCode, DieselCompanyName, Remark1, UserID } = req.body;
  const query = `
      INSERT INTO DieselCompanyMaster (DieselCompanyCode, DieselCompanyName, Remark1, UserID)
      VALUES ('${DieselCompanyCode}', N'${DieselCompanyName}', N'${Remark1}', '${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Diesel company created successfully' });
    }
  });
});

// PUT update an existing diesel company
app.put('/api/diesel-company/:DieselCompanyCode', authenticateToken, (req, res) => {
  const { DieselCompanyCode } = req.params;
  const { DieselCompanyName, Remark1, UserID } = req.body;
  const query = `
      UPDATE DieselCompanyMaster
      SET DieselCompanyName=N'${DieselCompanyName}', Remark1=N'${Remark1}', UserID='${UserID}'
      WHERE DieselCompanyCode='${DieselCompanyCode}';
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Diesel company updated successfully',
          DieselCompanyCode: DieselCompanyCode,
          DieselCompanyName,
          Remark1,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a diesel company
app.delete('/api/diesel-company/:DieselCompanyCode', authenticateToken, async (req, res) => {
  const { DieselCompanyCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM DieselCompanyMaster WHERE DieselCompanyCode='${DieselCompanyCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Diesel company deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




//For PartyMaster
// GET all PartyMaster
app.get('/api/party', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM PartyMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST create a new party
app.post('/api/party', authenticateToken, (req, res) => {
  const { PartyCode, PartyName, PartyAddress, PartyDistance, Remark1, UserID } = req.body;
  const query = `
      INSERT INTO PartyMaster (PartyCode, PartyName, PartyAddress, PartyDistance, Remark1, UserID)
      VALUES ('${PartyCode}', N'${PartyName}', N'${PartyAddress}', '${PartyDistance}', N'${Remark1}', '${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Party created successfully' });
    }
  });
});

// PUT update an existing party
app.put('/api/party/:PartyCode', authenticateToken, (req, res) => {
  const { PartyCode } = req.params;
  const { PartyName, PartyAddress, PartyDistance, Remark1, UserID } = req.body;
  const query = `
      UPDATE PartyMaster
      SET PartyName=N'${PartyName}', PartyAddress=N'${PartyAddress}', PartyDistance='${PartyDistance}', Remark1=N'${Remark1}', UserID='${UserID}'
      WHERE PartyCode='${PartyCode}';
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Party updated successfully',
          PartyCode: PartyCode,
          PartyName,
          PartyAddress,
          PartyDistance,
          Remark1,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a party
app.delete('/api/party/:PartyCode', authenticateToken, async (req, res) => {
  const { PartyCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM PartyMaster WHERE PartyCode='${PartyCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Party deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//For SlabMaster
// GET all SlabMaster
app.get('/api/slab', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM SlabMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST create a new slab
app.post('/api/slab', authenticateToken, (req, res) => {
  const { SlabCode, Slab, Distance, Remark1, Remark2, Remark3, UserID } = req.body;
  const query = `
      INSERT INTO SlabMaster (SlabCode, Slab, Distance, Remark1, Remark2, Remark3, UserID)
      VALUES ('${SlabCode}', N'${Slab}', '${Distance}', N'${Remark1}', N'${Remark2}', N'${Remark3}', N'${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Slab created successfully' });
    }
  });
});

// PUT update an existing slab
app.put('/api/slab/:SlabCode', authenticateToken, (req, res) => {
  const { SlabCode } = req.params;
  const { Slab, Distance, Remark1, Remark2, Remark3, UserID } = req.body;
  const query = `
      UPDATE SlabMaster
      SET Slab=N'${Slab}', Distance='${Distance}', Remark1=N'${Remark1}', Remark2=N'${Remark2}', Remark3=N'${Remark3}', UserID=N'${UserID}'
      WHERE SlabCode='${SlabCode}';
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'Slab updated successfully',
          SlabCode: SlabCode,
          Slab,
          Distance,
          Remark1,
          Remark2,
          Remark3,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a slab
app.delete('/api/slab/:SlabCode', authenticateToken, async (req, res) => {
  const { SlabCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM SlabMaster WHERE SlabCode='${SlabCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Slab deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all Paysheet entries
app.get('/api/paysheets', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM Paysheet';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/AutoData', authenticateToken, (req, res) => {
  const query = 'Select a.empcode,a.empname,b.Designation,c.BaiscPay,c.TDS,round(c.BaiscPay *.12,0)  as PF  from EmployeeMaster as a,DesignationMaster as b, EmpSalaryMaster AS c where emptypecode = 2 and a.DesgCode = b.DesigCode and a.empcode = c.EmpCode';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

app.get('/api/AutoPresenty', authenticateToken, (req, res) => {
  const query = 'SELECT empcode,count(empcode) as PresentDays FROM AttendanceEntry  where presentyn  = 1 and EmpTypeCode = 2 group by empcode';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new Paysheet entry
app.post('/api/paysheets', authenticateToken, (req, res) => {
  const {
    EntryNo,
    flag,
    TrDate,
    EmpCode,
    PresentDays,
    PaidLeaves,
    UnPaid,
    Grade,
    BaiscPay,
    Allow1,
    Allow2,
    GrossPay,
    PF,
    TDS,
    ProfTax,
    ESIC,
    Ded1,
    Ded2,
    TotalDed,
    NetPay,
    Remark1,
    Remark2,
    EmpDeptCode,
    CompCode,
    deptcode,
    yearcode,
    UserID
  } = req.body;
  const query = `
      INSERT INTO Paysheet (EntryNo,flag, TrDate, EmpCode, PresentDays, PaidLeaves, UnPaid, Grade, BaiscPay, Allow1, Allow2, GrossPay, PF, TDS, ProfTax, ESIC, Ded1, Ded2, TotalDed, NetPay, Remark1, Remark2, EmpDeptCode, CompCode, deptcode, yearcode, UserID)
      VALUES (${EntryNo || 0}, '${flag || 0}','${TrDate || 0}', ${EmpCode || 0}, ${PresentDays || 0}, ${PaidLeaves || 0}, ${UnPaid || 0}, ${Grade || 0}, ${BaiscPay || 0}, ${Allow1 || 0}, ${Allow2 || 0}, ${GrossPay || 0}, ${PF || 0}, ${TDS || 0}, ${ProfTax || 0}, ${ESIC || 0}, ${Ded1 || 0}, ${Ded2 || 0}, ${TotalDed || 0}, ${NetPay || 0}, '${Remark1 || 0}', '${Remark2 || 0}', ${EmpDeptCode || 0}, ${CompCode || 0}, ${deptcode || 0}, ${yearcode || 0}, ${UserID || 0});
    `;

  console.log('query:', query);

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Paysheet created successfully' });
      console.log('query:', query);

    }
  });
});

app.post('/api/paysheetsNew/:EntryNo', authenticateToken, (req, res) => {
  const entryNo = req.params.EntryNo;
  const requestData = req.body;
  const values = requestData.map(entry => `(
    ${entry.EntryNo || 0}, 
    '${entry.flag || ''}', 
    '${entry.TrDate || ''}', 
    ${entry.EmpCode || 0}, 
    ${entry.PresentDays || 0}, 
    ${entry.PaidLeaves || 0}, 
    ${entry.UnPaid || 0}, 
    ${entry.Grade || 0}, 
    ${entry.BaiscPay || 0}, 
    ${entry.Allow1 || 0}, 
    ${entry.Allow2 || 0}, 
    ${entry.GrossPay || 0}, 
    ${entry.PF || 0}, 
    ${entry.TDS || 0}, 
    ${entry.ProfTax || 0}, 
    ${entry.ESIC || 0}, 
    ${entry.Ded1 || 0}, 
    ${entry.Ded2 || 0}, 
    ${entry.TotalDed || 0}, 
    ${entry.NetPay || 0}, 
    '${entry.Remark1 || ''}', 
    '${entry.Remark2 || ''}', 
    ${entry.EmpDeptCode || 0}, 
    ${entry.CompCode || 0}, 
    ${entry.deptcode || 0}, 
    ${entry.yearcode || 0}, 
    '${entry.UserID || ''}'
    )`).join(',');

  let query = `
    DELETE FROM Paysheet WHERE EntryNo = ${entryNo} AND flag = '${TrDate}';

    INSERT INTO Paysheet (
      EntryNo, flag, TrDate, EmpCode, PresentDays, PaidLeaves, UnPaid, Grade, BaiscPay, Allow1, Allow2, GrossPay, PF, TDS, ProfTax, ESIC, Ded1, Ded2, TotalDed, NetPay, Remark1, Remark2, EmpDeptCode, CompCode, deptcode, yearcode, UserID
    ) VALUES ${values};
`;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);

      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

// app.post('/api/paysheets', authenticateToken, (req, res) => {
//   const {
//     EntryNo,
//     flag,
//     TrDate,
//     EmpCode,
//     PresentDays,
//     PaidLeaves,
//     UnPaid,
//     Grade,
//     BaiscPay,
//     Allow1,
//     Allow2,
//     GrossPay,
//     PF,
//     TDS,
//     ProfTax,
//     ESIC,
//     Ded1,
//     Ded2,
//     TotalDed,
//     NetPay,
//     Remark1,
//     Remark2,
//     EmpDeptCode,
//     CompCode,
//     deptcode,
//     yearcode,
//     UserID
//   } = req.body;

//   // Set defaults for undefined or null values
//   const defaults = {
//     PresentDays: 0,
//     PaidLeaves: 0,
//     UnPaid: 0,
//     Grade: 0,
//     BaiscPay: 0,
//     Allow1: 0,
//     Allow2: 0,
//     GrossPay: 0,
//     PF: 0,
//     TDS: 0,
//     ProfTax: 0,
//     ESIC: 0,
//     Ded1: 0,
//     Ded2: 0,
//     TotalDed: 0,
//     NetPay: 0,
//     Remark1: '',
//     Remark2: '',
//     EmpDeptCode: 0,
//     CompCode: 0,
//     deptcode: 0,
//     yearcode: 0,
//     UserID: 0
//   };

//   // Applying defaults
//   const entryData = {
//     EntryNo: EntryNo || 0,
//     flag: flag || '',
//     TrDate: TrDate || '',
//     EmpCode: EmpCode || 0,
//     PresentDays: PresentDays || defaults.PresentDays,
//     PaidLeaves: PaidLeaves || defaults.PaidLeaves,
//     UnPaid: UnPaid || defaults.UnPaid,
//     Grade: Grade || defaults.Grade,
//     BaiscPay: BaiscPay || defaults.BaiscPay,
//     Allow1: Allow1 || defaults.Allow1,
//     Allow2: Allow2 || defaults.Allow2,
//     GrossPay: GrossPay || defaults.GrossPay,
//     PF: PF || defaults.PF,
//     TDS: TDS || defaults.TDS,
//     ProfTax: ProfTax || defaults.ProfTax,
//     ESIC: ESIC || defaults.ESIC,
//     Ded1: Ded1 || defaults.Ded1,
//     Ded2: Ded2 || defaults.Ded2,
//     TotalDed: TotalDed || defaults.TotalDed,
//     NetPay: NetPay || defaults.NetPay,
//     Remark1: Remark1 || defaults.Remark1,
//     Remark2: Remark2 || defaults.Remark2,
//     EmpDeptCode: EmpDeptCode || defaults.EmpDeptCode,
//     CompCode: CompCode || defaults.CompCode,
//     deptcode: deptcode || defaults.deptcode,
//     yearcode: yearcode || defaults.yearcode,
//     UserID: UserID || defaults.UserID
//   };

//   const query = `
//       INSERT INTO Paysheet 
//       (EntryNo, flag, TrDate, EmpCode, PresentDays, PaidLeaves, UnPaid, Grade, BaiscPay, Allow1, Allow2, GrossPay, PF, TDS, ProfTax, ESIC, Ded1, Ded2, TotalDed, NetPay, Remark1, Remark2, EmpDeptCode, CompCode, deptcode, yearcode, UserID)
//       VALUES (${entryData.EntryNo}, '${entryData.flag}', '${entryData.TrDate}', ${entryData.EmpCode}, ${entryData.PresentDays}, ${entryData.PaidLeaves}, ${entryData.UnPaid}, ${entryData.Grade}, ${entryData.BaiscPay}, ${entryData.Allow1}, ${entryData.Allow2}, ${entryData.GrossPay}, ${entryData.PF}, ${entryData.TDS}, ${entryData.ProfTax}, ${entryData.ESIC}, ${entryData.Ded1}, ${entryData.Ded2}, ${entryData.TotalDed}, ${entryData.NetPay}, '${entryData.Remark1}', '${entryData.Remark2}', ${entryData.EmpDeptCode}, ${entryData.CompCode}, ${entryData.deptcode}, ${entryData.yearcode}, ${entryData.UserID});
//     `;

//   sql.query(query, (err) => {
//     if (err) {
//       console.log('Error:', err);
//       console.log('query:', query);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json({ message: 'Paysheet created successfully' });
//     }
//   });
// });


// PUT (update) a Paysheet entry by EntryNo
app.put('/api/paysheets/:entryNo', authenticateToken, (req, res) => {
  const { entryNo } = req.params;
  const {
    flag,
    TrDate,
    EmpCode,
    PresentDays,
    PaidLeaves,
    UnPaid,
    Grade,
    BaiscPay,
    Allow1,
    Allow2,
    GrossPay,
    PF,
    TDS,
    ProfTax,
    ESIC,
    Ded1,
    Ded2,
    TotalDed,
    NetPay,
    Remark1,
    Remark2,
    EmpDeptCode,
    CompCode,
    deptcode,
    yearcode,
    UserID
  } = req.body;
  const query = `
      UPDATE Paysheet
      SET flag='${flag}', TrDate='${TrDate}', EmpCode='${EmpCode}', PresentDays='${PresentDays}', PaidLeaves='${PaidLeaves}', UnPaid='${UnPaid}', Grade='${Grade}', BaiscPay='${BaiscPay}', Allow1='${Allow1}', Allow2='${Allow2}', GrossPay='${GrossPay}', PF='${PF}', TDS='${TDS}', ProfTax='${ProfTax}', ESIC='${ESIC}', Ded1='${Ded1}', Ded2='${Ded2}', TotalDed='${TotalDed}', NetPay='${NetPay}', Remark1='${Remark1}', Remark2='${Remark2}', EmpDeptCode='${EmpDeptCode}', CompCode='${CompCode}', deptcode='${deptcode}', yearcode='${yearcode}', UserID='${UserID}'
      WHERE EntryNo=${entryNo} AND EmpCode=${EmpCode};
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);

      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        console.log('query:', query);
        res.json({
          message: 'Paysheet updated successfully',
          entryNo,
          flag,
          TrDate,
          EmpCode,
          PresentDays,
          PaidLeaves,
          UnPaid,
          Grade,
          BaiscPay,
          Allow1,
          Allow2,
          GrossPay,
          PF,
          TDS,
          ProfTax,
          ESIC,
          Ded1,
          Ded2,
          TotalDed,
          NetPay,
          Remark1,
          Remark2,
          EmpDeptCode,
          CompCode,
          deptcode,
          yearcode,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE a Paysheet entry by EntryNo
app.delete('/api/paysheets/:entryNo/:EmpCode', authenticateToken, (req, res) => {
  const { entryNo, EmpCode } = req.params;
  const UserName = req.headers['username'];

  try {
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      if (userResults.recordset && userResults.recordset.length > 0) {
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          const deleteQuery = `DELETE FROM Paysheet WHERE EntryNo='${entryNo}' AND EmpCode= ${EmpCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Paysheet deleted successfully' });
            }
          });
        } else {
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/Mainpaysheets/:entryNo', authenticateToken, (req, res) => {
  const { entryNo } = req.params;
  const UserName = req.headers['username'];

  try {
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      if (userResults.recordset && userResults.recordset.length > 0) {
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          const deleteQuery = `DELETE FROM Paysheet WHERE EntryNo='${entryNo}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Paysheet deleted successfully' });
            }
          });
        } else {
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all EmpSalaryMaster entries
app.get('/api/empsalarymaster', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM EmpSalaryMaster';
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(result.recordset);
    }
  });
});

// POST a new EmpSalaryMaster entry
app.post('/api/empsalarymaster', authenticateToken, (req, res) => {
  const {
    EntryNo,
    flag,
    TrDate,
    EmpCode,
    BaiscPay,
    TDS,
    Remark1,
    Remark2,
    Remark3,
    Remark4,
    CompCode,
    deptcode,
    yearcode,
    UserID
  } = req.body;
  const query = `
      INSERT INTO EmpSalaryMaster (EntryNo, flag, TrDate, EmpCode, BaiscPay, TDS, Remark1, Remark2, Remark3, Remark4, CompCode, deptcode, yearcode, UserID)
      VALUES (${EntryNo}, '${flag}', '${TrDate}', '${EmpCode}', ${BaiscPay}, ${TDS}, '${Remark1}', '${Remark2}', '${Remark3}', '${Remark4}', '${CompCode}', '${deptcode}', '${yearcode}', '${UserID}');
    `;
  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'EmpSalaryMaster entry created successfully' });
    }
  });
});

// PUT (update) an EmpSalaryMaster entry by EntryNo
app.put('/api/empsalarymaster/:entryNo', authenticateToken, (req, res) => {
  const { entryNo } = req.params;
  const {
    flag,
    TrDate,
    EmpCode,
    BaiscPay,
    TDS,
    Remark1,
    Remark2,
    Remark3,
    Remark4,
    CompCode,
    deptcode,
    yearcode,
    UserID
  } = req.body;
  const query = `
      UPDATE EmpSalaryMaster
      SET flag='${flag}', TrDate='${TrDate}', BaiscPay=${BaiscPay}, TDS=${TDS}, Remark1='${Remark1}', Remark2='${Remark2}', Remark3='${Remark3}', Remark4='${Remark4}', CompCode='${CompCode}', deptcode='${deptcode}', yearcode='${yearcode}', UserID='${UserID}'
      WHERE EntryNo=${entryNo} AND EmpCode='${EmpCode}';
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'EmpSalaryMaster entry updated successfully',
          entryNo,
          flag,
          TrDate,
          EmpCode,
          BaiscPay,
          TDS,
          Remark1,
          Remark2,
          Remark3,
          Remark4,
          CompCode,
          deptcode,
          yearcode,
          UserID,
        });
      } else {
        res.status(404).json({ error: 'Record not found' });
      }
    }
  });
});

// DELETE an EmpSalaryMaster entry by EntryNo
app.delete('/api/empsalarymaster/:entryNo/:EmpCode', authenticateToken, (req, res) => {
  const { entryNo, EmpCode } = req.params;
  const UserName = req.headers['username'];
  try {
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;
    sql.query(userPermissionsQuery, (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      if (userResults.recordset && userResults.recordset.length > 0) {
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          const deleteQuery = `DELETE FROM EmpSalaryMaster WHERE EntryNo='${entryNo}' AND EmpCode='${EmpCode}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'EmpSalaryMaster entry deleted successfully' });
            }
          });
        } else {
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/Mainempsalarymaster/:entryNo', authenticateToken, (req, res) => {
  const { entryNo } = req.params;
  const UserName = req.headers['username'];
  try {
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;
    sql.query(userPermissionsQuery, (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      if (userResults.recordset && userResults.recordset.length > 0) {
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          const deleteQuery = `DELETE FROM EmpSalaryMaster WHERE EntryNo='${entryNo}'`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'EmpSalaryMaster entry deleted successfully' });
            }
          });
        } else {
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
    SubLedgerGroupCode,
    SubAcCode,
    OpBal,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;
  const query = `
      INSERT INTO TranSubLedgerMaster (AcCode, SubLedgerGroupCode, SubAcCode, OpBal, DeptCode, YearCode, UserID)
      VALUES (${AcCode}, ${SubLedgerGroupCode}, ${SubAcCode}, ${OpBal}, ${DeptCode}, ${YearCode}, '${UserID}');
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

// Endpoint to handle saving multiple TranLedger entries
app.post('/api/saveAllsubTranLedgers', (req, res) => {
  const { requestData, AcCode, SubLedgerGroupCode, SubAcCode, YearCode, CompCode, UserID } = req.body; // Assuming requestData is an array of objects

  // Prepare values for SQL query
  const values = requestData.map(entry => `(
    ${AcCode},
    ${SubLedgerGroupCode},
    ${SubAcCode},
    ${entry.OpBal},
    ${DeptCode},
    ${YearCode},
    ${CompCode},
    '${UserID}'
  )`).join(',');

  // SQL query to insert multiple entries into TranLedgerMaster table
  const query = `
    Delete from TranSubLedgerMaster where AcCode =${AcCode} AND SubLedgerGroupCode =${SubLedgerGroupCode} ;

    INSERT INTO TranSubLedgerMaster (AcCode, SubLedgerGroupCode, SubAcCode, OpBal, DeptCode, YearCode, UserID)
    VALUES ${values};
    `;

  // Execute SQL query
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranLedger entries saved successfully' });
    }
  });
});


// Update a TranSubLedger entry
// app.put('/api/tranSubLedgers/:acCode', (req, res) => {
//   const { acCode } = req.params;
//   const {
//     SubAcCode,
//     OpBal,
//     TOpBal,
//     Debit,
//     Credit,
//     CurBal,
//     DeptCode,
//     YearCode,
//     UserID,
//     SubLedgerGroupCode,
//   } = req.body;
//   const query = `
//       UPDATE TranSubLedgerMaster
//       SET SubAcCode='${SubAcCode}', OpBal='${OpBal}', TOpBal='${TOpBal}', Debit='${Debit}', Credit='${Credit}', CurBal='${CurBal}', DeptCode='${DeptCode}', YearCode='${YearCode}', UserID='${UserID}', SubLedgerGroupCode='${SubLedgerGroupCode}'
//       WHERE AcCode='${acCode}';
//     `;
//   sql.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       if (result.rowsAffected && result.rowsAffected[0] > 0) {
//         res.json({
//           message: 'TranSubLedger updated successfully',
//           AcCode: acCode,
//           SubAcCode,
//           OpBal,
//           TOpBal,
//           Debit,
//           Credit,
//           CurBal,
//           DeptCode,
//           YearCode,
//           UserID,
//           SubLedgerGroupCode,
//         });
//       } else {
//         res.status(404).json({ error: 'Record not found' });
//       }
//     }
//   });
// });

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
    CompCode,
    YearCode,
    UserID,
    SubLedgerGroupCode,
  } = req.body;
  const query = `
      UPDATE TranSubLedgerMaster
      SET  OpBal=${OpBal}, UserID='${UserID}'
      WHERE AcCode=${acCode} AND SubLedgerGroupCode=${SubLedgerGroupCode} AND SubAcCode=${SubAcCode} AND  DeptCode=${DeptCode} AND YearCode=${YearCode} AND YearCode=${YearCode} ;
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
app.delete('/api/tranSubLedgers/:acCode/:SubAcCode/:SubLedgerGroupCode', async (req, res) => {
  const { acCode, SubAcCode, SubLedgerGroupCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranSubLedgerMaster WHERE AcCode=${acCode} AND SubAcCode=${SubAcCode} AND SubLedgerGroupCode=${SubLedgerGroupCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'TranSubLedger deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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

app.get('/api/getCr/:compcode/:deptcode', (req, res) => {
  const { compcode, deptcode } = req.params;

  // Correct the query string to separate queries with a semicolon
  const query = `
    select sum(opbal) as cramt from tranledgermaster where opbal > 0 and deptcode = ${deptcode} and compcode = ${compcode};
    select sum(opbal) as dramt from tranledgermaster where opbal < 0 and deptcode = ${deptcode} and compcode = ${compcode};
  `;

  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      // Process the results from both queries
      const cramt = result.recordsets[0][0].cramt || 0;
      const dramt = result.recordsets[1][0].dramt || 0;

      // Send the combined result
      res.json({ cramt, dramt });
    }
  });
});


// app.get('/api/getCr/:compcode/:deptcode', (req, res) => {
//   const { compcode , deptcode  } = req.params;

//   const query = `select sum(opbal) as cramt from tranledgermaster where opbal > 0 and  deptcode = ${deptcode} and compcode = ${compcode}
//                 select sum(opbal) as dramt from tranledgermaster where opbal < 0 and  deptcode = ${deptcode} and compcode = ${compcode}`;
//   sql.query(query, (err, result) => {
//     if (err) {
//       console.log('Error:', err);
//       res.status(500).json({ error: 'Internal server error' });
//     } else {
//       res.json(result.recordset);
//     }
//   });
// });



// POST a new TranLedgerMaster entry
app.post('/api/tranledgers', (req, res) => {
  const {
    AcCode,
    OpBal,
    CompCode,
    DeptCode,
    YearCode,
    UserID,
  } = req.body;


  const query = `
      INSERT INTO TranLedgerMaster (AcCode, OpBal,CompCode, DeptCode, YearCode, UserID)
      VALUES (${AcCode}, ${OpBal},${CompCode}, ${DeptCode}, ${YearCode}, '${UserID}');
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

// Endpoint to handle saving multiple TranLedger entries
app.post('/api/saveAllTranLedgers', (req, res) => {
  const { requestData, DeptCode, YearCode, CompCode, UserID } = req.body; // Assuming requestData is an array of objects

  // Prepare values for SQL query
  const values = requestData.map(entry => `(
    ${entry.AcCode},
    ${entry.OpBal},
    ${CompCode},
    ${DeptCode},
    ${YearCode},
    '${UserID}'
  )`).join(',');

  // SQL query to insert multiple entries into TranLedgerMaster table
  const query = `
    Delete from TranLedgerMaster ;

    INSERT INTO TranLedgerMaster (AcCode, OpBal, CompCode, DeptCode, YearCode, UserID)
    VALUES ${values};
  `;

  // Execute SQL query
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'TranLedger entries saved successfully' });
    }
  });
});

// PUT (Update) an existing TranLedgerMaster entry
app.put('/api/tranledgers/:AcCode', (req, res) => {
  const { AcCode } = req.params;
  const {
    OpBal,
    DeptCode,
    YearCode,
    CompCode,
    UserID,
  } = req.body;

  const query = `
      UPDATE TranLedgerMaster
      SET OpBal=${OpBal}, CompCode=${CompCode}, DeptCode=${DeptCode}, YearCode=${YearCode}, UserID='${UserID}'
      WHERE AcCode=${AcCode};
    `;
  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        res.json({
          message: 'TranLedger updated successfully',
          AcCode: AcCode,
          OpBal,
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
app.delete('/api/tranledgers/:AcCode', async (req, res) => {
  const { AcCode } = req.params;
  const UserName = req.headers['username'];

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowMasterDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowMasterDelete } = userResults.recordset[0];

        if (AllowMasterDelete === 1) {
          // The user has permission to delete entries
          const deleteQuery = `DELETE FROM TranLedgerMaster WHERE AcCode=${AcCode}`;

          sql.query(deleteQuery, (deleteErr) => {
            if (deleteErr) {
              console.log('Error deleting entry:', deleteErr);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'TranLedger deleted successfully' });
            }
          });
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//directInward
app.post('/api/singleDISave', authenticateToken, (req, res) => {
  const {
    EntryNo,
    DoDate,
    DONo,
    TrDate,
    ProductCode,
    ItemCode,
    TalukaCode,
    GangCode2,
    HamaliTypeCode2,
    Weight,
    Qty,
    VehicleCode,
    BuiltyTPNO,
    CompCode,
    DeptCode,
    YearCode,
    locationCode,
    UserID,
    editRoomId
  } = req.body;

  const query = `
      DELETE FROM RRWagonEntry 
      WHERE EntryNo = ${EntryNo}
      AND Flag = 'DI' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode} AND EntryNo = ${EntryNo} AND DesptachEntryNo = ${editRoomId} AND BiltiNo = ${BuiltyTPNO};

      INSERT INTO RRWagonEntry (
        EntryNo,
        DONo,
        TrDate,
        DoDate,
        ProductCode,
        ItemCode,
        TalukaCode,
        GangCode2,
        HamaliTypeCode2,
        Qty,
        Weight,
        VehicleCode,
        BuiltyTPNO,
        locationCode,
        DeptCode,
        YearCode,
        Compcode,
        UserID,
        DesptachEntryNo,
        Flag
      ) VALUES (
        ${EntryNo}, 
        '${DONo}', 
        '${TrDate}', 
        '${DoDate}',
        ${ProductCode},
        ${ItemCode},
        ${TalukaCode}, 
        ${GangCode2}, 
        ${HamaliTypeCode2},
        ${Qty}, 
        ${Weight}, 
        '${VehicleCode}',
        ${BuiltyTPNO},
        ${locationCode},
        ${DeptCode},
        ${YearCode},
        ${CompCode},
        '${UserID}',
        ${editRoomId},
        'DI'
      );
    `;

  sql.query(query, (err) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Entry saved successfully' });
    }
  });
});

app.post('/api/DirectInward/:EntryNo', authenticateToken, (req, res) => {
  const entryNo = req.params.EntryNo;
  const {requestData, CompCode,YearCode,DeptCode} = req.body;
  const values = requestData.map(entry => `(
    ${entryNo}, 
    '${entry.TrDate}', 
    '${entry.DONo}', 
    '${entry.DoDate ? entry.DoDate : entry.TrMonth}',
    ${entry.ProductCode},
    ${entry.YojanaCode ? entry.YojanaCode : entry.editRoomId},
    ${entry.TalukaCode}, 
    ${entry.GangCode}, 
    ${entry.HamaliTypeCode},
    ${entry.Qty}, 
    ${entry.Weight}, 
    '${entry.VehicleCode}',
    ${entry.BuiltyTPNO || entry.BiltiNo},
    ${entry.locationCode || entry.LocationCode},
    ${entry.DeptCode},
    ${entry.YearCode},
    ${entry.CompCode ? entry.CompCode : entry.Compcode},
    '${entry.UserID}',
    ${entry.editRoomId ? entry.editRoomId : entry.DesptachEntryNo},
    'DI'
    )`).join(',');

  let query = `
    delete from RRWagonEntry where EntryNo = ${entryNo} AND Flag = 'DI' AND CompCode = ${CompCode} AND YearCode = ${YearCode} AND DeptCode = ${DeptCode};

    INSERT INTO RRWagonEntry (
      EntryNo,
      TrDate,
      DONo,
      TrMonth,
      ProductCode,
      YojanaCode,
      TalukaCode,
      GangCode1,
      HamaliTypeCode1,
      Qty,
      Weight,
      VehicleCode,
      BiltiNo,
      LocationCode,
      DeptCode,
      YearCode,
      Compcode,
      UserID,
      DesptachEntryNo,
      Flag
    ) VALUES ${values};`;


  sql.query(query, (err, result) => {
    if (err) {
      console.log('Error:', err);
      console.log('query:', query);

      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json({ message: 'Data saved successfully' });
    }
  });
});

app.delete('/api/DirectInward/:EntryNo', authenticateToken, async (req, res) => {
  const EntryNo = req.params.EntryNo;
  const UserName = req.headers['username'];
  const {CompCode,YearCode,DeptCode} = req.query;

  try {
    // Fetch user permissions from the database based on the user making the request
    const userPermissionsQuery = `SELECT AllowEntryDelete FROM Users WHERE UserName='${UserName}'`;

    sql.query(userPermissionsQuery, async (userErr, userResults) => {
      if (userErr) {
        console.log('Error fetching user permissions:', userErr);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user results are not empty
      if (userResults.recordset && userResults.recordset.length > 0) {
        // Check if user has permission to delete entries
        const { AllowEntryDelete } = userResults.recordset[0];

        if (AllowEntryDelete === 1) {
          // The user has permission to delete entries
          const query = `DELETE FROM RRWagonEntry WHERE EntryNo = ${EntryNo} AND Flag ='DI' AND DeptCode = ${DeptCode} AND YearCode = ${YearCode} AND Compcode = ${CompCode} `;

          try {
            await sql.query(query);
            res.json({ message: 'Success' });
          } catch (error) {
            console.log('Error:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // User does not have permission to delete entries
          res.status(403).json({ error: 'Permission denied. You do not have the necessary permissions to delete entries.' });
        }
      } else {
        // User not found in the database
        res.status(404).json({ error: 'User not found.' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

